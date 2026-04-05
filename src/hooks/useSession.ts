import { useState, useCallback, useRef, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import type { TranscriptSegment, WhisperCardData, Mode, Debrief } from '../types';
import { AudioStreamer } from '../services/audio';

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

  // Wire up socket listeners
  useEffect(() => {
    if (!socket) return;

    const onTranscriptDelta = (data: { text: string; speaker?: string; timestamp?: number }) => {
      const segment: TranscriptSegment = {
        id: `interim-${Date.now()}`,
        text: data.text,
        speaker: data.speaker,
        timestamp: data.timestamp || Date.now(),
        isFinal: false,
      };
      setTranscriptSegments((prev) => {
        // Replace the last interim segment or add new one
        const withoutInterim = prev.filter((s) => s.isFinal);
        return [...withoutInterim, segment];
      });
    };

    const onTranscriptFinal = (data: { text: string; speaker?: string; timestamp?: number }) => {
      segmentCounterRef.current += 1;
      const segment: TranscriptSegment = {
        id: `final-${segmentCounterRef.current}`,
        text: data.text,
        speaker: data.speaker,
        timestamp: data.timestamp || Date.now(),
        isFinal: true,
      };
      setTranscriptSegments((prev) => {
        const withoutInterim = prev.filter((s) => s.isFinal);
        return [...withoutInterim, segment];
      });
    };

    const onWhisperCard = (data: WhisperCardData) => {
      setWhisperCards((prev) => {
        const next = [...prev, { ...data, id: data.id || `whisper-${Date.now()}` }];
        return next.length > 100 ? next.slice(-100) : next;
      });
    };

    const onThinking = () => {
      setIsThinking(true);
    };

    const onInferenceResult = () => {
      setIsThinking(false);
    };

    const onLiveStatus = (data: { isLive: boolean; modeId: string; sessionId: string }) => {
      setLiveStatus(data.isLive ? 'active' : 'inactive');
    };

    const onSessionStatus = (data: { status: string }) => {
      if (data.status === 'completed') {
        setPhase('debrief');
      }
    };

    const onDebriefReady = (data: Debrief) => {
      setDebrief(data);
      setPhase('debrief');
    };

    socket.on('transcript:delta', onTranscriptDelta);
    socket.on('transcript:final', onTranscriptFinal);
    socket.on('whisper:card', onWhisperCard);
    socket.on('inference:thinking', onThinking);
    socket.on('inference:result', onInferenceResult);
    socket.on('session:live-status', onLiveStatus);
    socket.on('session:status', onSessionStatus);
    socket.on('debrief:ready', onDebriefReady);

    return () => {
      socket.off('transcript:delta', onTranscriptDelta);
      socket.off('transcript:final', onTranscriptFinal);
      socket.off('whisper:card', onWhisperCard);
      socket.off('inference:thinking', onThinking);
      socket.off('inference:result', onInferenceResult);
      socket.off('session:live-status', onLiveStatus);
      socket.off('session:status', onSessionStatus);
      socket.off('debrief:ready', onDebriefReady);
    };
  }, [socket]);

  const selectMode = useCallback(
    (mode: Mode) => {
      setSelectedMode(mode);
      if (socket) {
        socket.emit('session:prepare', { modeId: mode.id });
      }
    },
    [socket]
  );

  const startSession = useCallback(async () => {
    if (!socket || !selectedMode) return;

    setTranscriptSegments([]);
    setWhisperCards([]);
    setIsThinking(false);
    setDebrief(null);
    segmentCounterRef.current = 0;

    socket.emit('session:start-live', { modeId: selectedMode.id });
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

  const resetSession = useCallback(() => {
    setPhase('mode-select');
    setSelectedMode(null);
    setTranscriptSegments([]);
    setWhisperCards([]);
    setIsThinking(false);
    setDebrief(null);
    setLiveStatus('idle');
    segmentCounterRef.current = 0;
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
  };
}
