import { useState, useCallback, useRef, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import type { TranscriptSegment, WhisperCardData, Mode, Debrief } from '../types';
import { AudioStreamer } from '../services/audio';
import { api } from '../services/api';
import type { Session } from '../types';

export type SessionPhase = 'mode-select' | 'live' | 'debrief';

interface UseSessionReturn {
  phase: SessionPhase;
  selectedMode: Mode | null;
  transcriptSegments: TranscriptSegment[];
  whisperCards: WhisperCardData[];
  isThinking: boolean;
  debrief: Debrief | null;
  liveStatus: string;
  selectMode: (mode: Mode) => void;
  startSession: () => Promise<void>;
  stopSession: () => Promise<void>;
  dismissWhisper: (id: string) => void;
  resetSession: () => void;
  sendWhisperFeedback: (whisperId: string, feedback: 'positive' | 'negative') => void;
}

export function useSession(socket: Socket | null): UseSessionReturn {
  const [phase, setPhase] = useState<SessionPhase>('mode-select');
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [whisperCards, setWhisperCards] = useState<WhisperCardData[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [liveStatus, setLiveStatus] = useState<string>('idle');
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const segmentCounterRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);

  // Wire up socket listeners — using correct backend event names
  useEffect(() => {
    if (!socket) return;

    // Backend emits: transcript:delta { text, isFinal: false, speaker, timestamp, confidence }
    const onTranscriptDelta = (data: { text: string; speaker?: number | string; timestamp?: number }) => {
      const segment: TranscriptSegment = {
        id: `interim-${Date.now()}`,
        text: data.text,
        speaker: data.speaker != null ? String(data.speaker) : undefined,
        timestamp: data.timestamp || Date.now(),
        isFinal: false,
      };
      setTranscriptSegments((prev) => {
        const withoutInterim = prev.filter((s) => s.isFinal);
        return [...withoutInterim, segment];
      });
    };

    // Backend emits: transcript:final { text, speaker, timestamp, confidence }
    const onTranscriptFinal = (data: { text: string; speaker?: number | string; timestamp?: number }) => {
      segmentCounterRef.current += 1;
      const segment: TranscriptSegment = {
        id: `final-${segmentCounterRef.current}`,
        text: data.text,
        speaker: data.speaker != null ? String(data.speaker) : undefined,
        timestamp: data.timestamp || Date.now(),
        isFinal: true,
      };
      setTranscriptSegments((prev) => {
        const withoutInterim = prev.filter((s) => s.isFinal);
        return [...withoutInterim, segment];
      });
    };

    // Backend emits: whisper:card — either full WhisperCard Prisma object (inference path)
    // or { sessionId, card } (legacy mock path). Handle both.
    const onWhisperCard = (data: WhisperCardData | { sessionId: string; card: WhisperCardData }) => {
      setIsThinking(false);
      const card: WhisperCardData = 'card' in data && data.card ? data.card : data as WhisperCardData;
      setWhisperCards((prev) => [...prev, { ...card, id: card.id || `whisper-${Date.now()}` }]);
    };

    // Backend emits: inference:thinking {} — empty object, just a signal
    const onThinking = () => {
      setIsThinking(true);
    };

    // Backend emits: session:live-status { isLive, modeId, sessionId }
    const onLiveStatus = (data: { isLive: boolean; modeId: string; sessionId: string }) => {
      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
      }
      setLiveStatus(data.isLive ? 'streaming' : 'stopped');
    };

    // Backend emits: session:status { sessionId, status, summary?, memoriesExtracted?, savesDetected? }
    const onSessionStatus = (data: { sessionId: string; status: string; summary?: unknown; memoriesExtracted?: number; savesDetected?: number }) => {
      if (data.status === 'completed') {
        setDebrief({
          sessionId: data.sessionId,
          summary: data.summary,
          memoriesExtracted: data.memoriesExtracted,
          savesDetected: data.savesDetected,
        });
        setPhase('debrief');
      }
    };

    // Backend emits: debrief:ready { sessionId } — signal to fetch session details
    const onDebriefReady = (data: { sessionId: string }) => {
      const sid = data.sessionId || sessionIdRef.current;
      if (sid) {
        api.get<Session>(`sessions/${sid}`).then((session) => {
          setDebrief({
            sessionId: sid,
            summary: session.summary,
            memoriesExtracted: undefined,
            savesDetected: undefined,
          });
          setPhase('debrief');
        }).catch(() => {
          // Still transition to debrief even if fetch fails
          setPhase('debrief');
        });
      } else {
        setPhase('debrief');
      }
    };

    // Backend event names from socket.ts / deepgram.service.ts / inference.service.ts
    socket.on('transcript:delta', onTranscriptDelta);
    socket.on('transcript:final', onTranscriptFinal);
    socket.on('whisper:card', onWhisperCard);
    socket.on('inference:thinking', onThinking);
    socket.on('session:live-status', onLiveStatus);
    socket.on('session:status', onSessionStatus);
    socket.on('debrief:ready', onDebriefReady);

    return () => {
      socket.off('transcript:delta', onTranscriptDelta);
      socket.off('transcript:final', onTranscriptFinal);
      socket.off('whisper:card', onWhisperCard);
      socket.off('inference:thinking', onThinking);
      socket.off('session:live-status', onLiveStatus);
      socket.off('session:status', onSessionStatus);
      socket.off('debrief:ready', onDebriefReady);
    };
  }, [socket]);

  // Clean up AudioStreamer on unmount to prevent orphaned recording loops
  useEffect(() => {
    return () => {
      if (audioStreamerRef.current) {
        audioStreamerRef.current.stop().catch(() => {
          // Best effort cleanup
        });
        audioStreamerRef.current = null;
      }
    };
  }, []);

  const selectMode = useCallback(
    (mode: Mode) => {
      setSelectedMode(mode);
      // Note: backend has no 'session:prepare' event — mode is passed on session:start-live
    },
    []
  );

  const startSession = useCallback(async () => {
    if (!socket || !selectedMode) return;

    setTranscriptSegments([]);
    setWhisperCards([]);
    setIsThinking(false);
    setDebrief(null);
    segmentCounterRef.current = 0;
    sessionIdRef.current = null;

    socket.emit('session:start-live', { modeId: selectedMode.modeId });
    setPhase('live');

    // Start audio streaming
    const streamer = new AudioStreamer(socket);
    audioStreamerRef.current = streamer;
    await streamer.start();
  }, [socket, selectedMode]);

  const stopSession = useCallback(async () => {
    // Stop audio first
    if (audioStreamerRef.current) {
      await audioStreamerRef.current.stop();
      audioStreamerRef.current = null;
    }

    if (socket) {
      socket.emit('session:stop-live');
    }

    setLiveStatus('stopping');
  }, [socket]);

  const dismissWhisper = useCallback((id: string) => {
    setWhisperCards((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const sendWhisperFeedback = useCallback(
    (whisperId: string, feedback: 'positive' | 'negative') => {
      if (socket) {
        // Backend expects: { cardId, helpful } not { whisperId, feedback }
        socket.emit('whisper:feedback', {
          cardId: whisperId,
          helpful: feedback === 'positive',
        });
      }
    },
    [socket]
  );

  const resetSession = useCallback(() => {
    setPhase('mode-select');
    setSelectedMode(null);
    setTranscriptSegments([]);
    setWhisperCards([]);
    setIsThinking(false);
    setDebrief(null);
    setLiveStatus('idle');
    segmentCounterRef.current = 0;
    sessionIdRef.current = null;
  }, []);

  return {
    phase,
    selectedMode,
    transcriptSegments,
    whisperCards,
    isThinking,
    debrief,
    liveStatus,
    selectMode,
    startSession,
    stopSession,
    dismissWhisper,
    resetSession,
    sendWhisperFeedback,
  };
}
