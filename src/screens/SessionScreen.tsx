import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import ReanimatedAnimated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { colors, spacing, fontSize } from '../theme';
import { ModeSelector } from '../components/ModeSelector';
import { ModePill } from '../components/ModePill';
import { LiveTranscript } from '../components/LiveTranscript';
import { WhisperCard } from '../components/WhisperCard';
import { ThinkingIndicator } from '../components/ThinkingIndicator';
import { useSocket } from '../hooks/useSocket';
import { useSession } from '../hooks/useSession';
import { requestMicPermission } from '../services/audio';
import { useApi } from '../hooks/useApi';
import type { Mode, Debrief } from '../types';
import type { RouteProp } from '@react-navigation/native';

type TabParamList = {
  Dashboard: undefined;
  Memory: undefined;
  Session: { modeId?: string } | undefined;
  Digest: undefined;
  Settings: undefined;
};

type SessionScreenRouteProp = RouteProp<TabParamList, 'Session'>;

interface SessionScreenProps {
  route: SessionScreenRouteProp;
}

const DEFAULT_MODES: Mode[] = [
  { modeId: 'meeting', name: 'Meeting', icon: 'people', description: 'Real-time meeting intelligence' },
  { modeId: 'translator', name: 'Translator', icon: 'language', description: 'Live translation assistance' },
  { modeId: 'think', name: 'Think', icon: 'bulb', description: 'Brainstorm with AI' },
  { modeId: 'sales', name: 'Sales', icon: 'trending-up', description: 'Close deals with AI coaching' },
  { modeId: 'learning', name: 'Learning', icon: 'school', description: 'Learn faster with AI insights' },
  { modeId: 'coach', name: 'Coach', icon: 'fitness', description: 'Personal performance coaching' },
  { modeId: 'builder', name: 'Builder', icon: 'construct', description: 'Build better with AI assistance' },
];

export function SessionScreen({ route }: SessionScreenProps) {
  const insets = useSafeAreaInsets();
  const { socket, isConnected, connect } = useSocket();
  const {
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
  } = useSession(socket);

  const { data: apiModes } = useApi<Mode[]>('modes');
  const modes = apiModes || DEFAULT_MODES;
  const [isStarting, setIsStarting] = useState(false);
  const [startingModeName, setStartingModeName] = useState<string | null>(null);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulsing live dot animation
  const liveDotOpacity = useSharedValue(1);
  const liveDotStyle = useAnimatedStyle(() => ({
    opacity: liveDotOpacity.value,
  }));

  useEffect(() => {
    if (phase === 'live') {
      liveDotOpacity.value = withRepeat(
        withTiming(0.3, { duration: 1000 }),
        -1,
        true,
      );
    } else {
      liveDotOpacity.value = 1;
    }
  }, [phase, liveDotOpacity]);

  // Session timer
  useEffect(() => {
    if (phase === 'live') {
      setSessionElapsed(0);
      sessionTimerRef.current = setInterval(() => {
        setSessionElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    }
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [phase]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Connect socket when screen mounts
  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [connect, isConnected]);

  // Auto-start session when a mode is selected
  const handleModeSelect = useCallback((mode: Mode) => {
    selectMode(mode);
    setStartingModeName(mode.name);
    setTimeout(async () => {
      setIsStarting(true);
      try {
        const granted = await requestMicPermission();
        if (!granted) {
          Alert.alert(
            'Microphone Access Required',
            'Angel AI needs microphone access to capture audio. Please enable it in Settings.',
          );
          setIsStarting(false);
          setStartingModeName(null);
          return;
        }
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await startSession();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start session';
        Alert.alert('Error', message);
      } finally {
        setIsStarting(false);
        setStartingModeName(null);
      }
    }, 500);
  }, [selectMode, startSession]);

  // Handle incoming modeId from navigation
  useEffect(() => {
    const modeId = route.params?.modeId;
    if (modeId && phase === 'mode-select') {
      const mode = modes.find((m) => m.modeId === modeId);
      if (mode) {
        handleModeSelect(mode);
      }
    }
  }, [route.params?.modeId, modes, phase, handleModeSelect]);

  // Handle socket disconnection during live session
  useEffect(() => {
    if (phase === 'live' && !isConnected) {
      // Socket disconnected mid-session — try to reconnect
      connect();
    }
  }, [phase, isConnected, connect]);

  const handleStop = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await stopSession();
  }, [stopSession]);

  const handleNewSession = useCallback(() => {
    resetSession();
  }, [resetSession]);

  const handleWhisperFeedback = useCallback(
    (id: string, feedback: 'positive' | 'negative') => {
      sendWhisperFeedback(id, feedback);
    },
    [sendWhisperFeedback]
  );

  // Memoize visible whispers to avoid creating new arrays on every render
  const visibleWhispers = useMemo(
    () => whisperCards.slice(-3).reverse(),
    [whisperCards]
  );

  // --- RENDER: Mode Selection ---
  if (phase === 'mode-select') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.phaseHeader}>
            <Text style={styles.phaseTitle}>New Session</Text>
            <Text style={styles.phaseSubtitle}>Select a conversation mode</Text>
          </View>

          <ModeSelector
            modes={modes}
            selectedMode={selectedMode}
            onSelect={handleModeSelect}
          />
        </ScrollView>

        {startingModeName && (
          <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.startButton, styles.buttonDisabled]}
            >
              <ActivityIndicator color={colors.text} />
              <Text style={styles.startButtonText}>
                Starting {startingModeName}...
              </Text>
            </LinearGradient>
          </View>
        )}
      </View>
    );
  }

  // --- RENDER: Live Session ---
  if (phase === 'live') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Live Header */}
        <View style={styles.liveHeader}>
          <View style={styles.liveHeaderLeft}>
            {selectedMode && <ModePill name={selectedMode.name} isActive />}
          </View>
          <View style={styles.liveIndicator}>
            <ReanimatedAnimated.View style={[styles.liveDot, !isConnected && styles.liveDotDisconnected, liveDotStyle]} />
            <Text style={[styles.liveText, !isConnected && styles.liveTextDisconnected]}>
              {isConnected ? 'LIVE' : 'RECONNECTING'}
            </Text>
            {isConnected && (
              <Text style={styles.timerText}>{formatTimer(sessionElapsed)}</Text>
            )}
          </View>
        </View>

        {/* Connection Status */}
        {liveStatus !== 'idle' && liveStatus !== 'connected' && (
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>{liveStatus}</Text>
          </View>
        )}

        {/* Transcript */}
        <View style={styles.transcriptContainer}>
          <LiveTranscript segments={transcriptSegments} />
        </View>

        {/* Thinking Indicator */}
        {isThinking && <ThinkingIndicator />}

        {/* Whisper Cards */}
        {visibleWhispers.length > 0 && (
          <View style={styles.whisperContainer}>
            {visibleWhispers.map((card, index) => (
              <WhisperCard
                key={card.id}
                card={card}
                onDismiss={dismissWhisper}
                onFeedback={handleWhisperFeedback}
                index={index}
              />
            ))}
          </View>
        )}

        {/* Stop Button */}
        <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleStop}
            activeOpacity={0.8}
          >
            <Ionicons name="stop" size={22} color={colors.text} />
            <Text style={styles.stopButtonText}>Stop Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- RENDER: Debrief ---
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.phaseHeader}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={styles.phaseTitle}>Session Complete</Text>
          {selectedMode && (
            <Text style={styles.phaseSubtitle}>{selectedMode.name} Session</Text>
          )}
        </View>

        {debrief ? (
          <DebriefView debrief={debrief} />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Preparing debrief...</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TouchableOpacity
          onPress={handleNewSession}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.newSessionButton}
          >
            <Ionicons name="add" size={22} color={colors.text} />
            <Text style={styles.startButtonText}>New Session</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Debrief sub-component
function DebriefView({ debrief }: { debrief: Debrief }) {
  // summary can be a Json object with fields like { summary, participants, keyFacts, promises, actionItems, risks }
  // or a string, or null
  const summaryObj = debrief.summary && typeof debrief.summary === 'object'
    ? debrief.summary as Record<string, unknown>
    : null;
  const summaryText = summaryObj?.summary
    ? String(summaryObj.summary)
    : (typeof debrief.summary === 'string' ? debrief.summary : null);
  const actionItems = Array.isArray(summaryObj?.actionItems) ? summaryObj.actionItems as string[] : [];
  const keyFacts = Array.isArray(summaryObj?.keyFacts) ? summaryObj.keyFacts as string[] : [];

  return (
    <View style={styles.debriefContainer}>
      {/* Stats Row */}
      <View style={styles.debriefStats}>
        <View style={styles.debriefStat}>
          <Text style={styles.debriefStatValue}>{debrief.memoriesExtracted ?? 0}</Text>
          <Text style={styles.debriefStatLabel}>Memories</Text>
        </View>
        <View style={styles.debriefStat}>
          <Text style={styles.debriefStatValue}>{debrief.savesDetected ?? 0}</Text>
          <Text style={styles.debriefStatLabel}>Saves</Text>
        </View>
        <View style={styles.debriefStat}>
          <Text style={styles.debriefStatValue}>{keyFacts.length}</Text>
          <Text style={styles.debriefStatLabel}>Key Facts</Text>
        </View>
      </View>

      {/* Summary */}
      {summaryText && (
        <View style={styles.debriefSection}>
          <Text style={styles.debriefSectionTitle}>Summary</Text>
          <Text style={styles.debriefText}>{summaryText}</Text>
        </View>
      )}

      {/* Key Facts */}
      {keyFacts.length > 0 && (
        <View style={styles.debriefSection}>
          <Text style={styles.debriefSectionTitle}>Key Facts</Text>
          {keyFacts.map((fact, index) => (
            <View key={index} style={styles.debriefListItem}>
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text style={styles.debriefListText}>{String(fact)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <View style={styles.debriefSection}>
          <Text style={styles.debriefSectionTitle}>Action Items</Text>
          {actionItems.map((item, index) => (
            <View key={index} style={styles.debriefListItem}>
              <Ionicons name="checkbox-outline" size={14} color={colors.primary} />
              <Text style={styles.debriefListText}>{String(item)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  phaseHeader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  phaseTitle: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  phaseSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
  },
  bottomAction: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  startButton: {
    borderRadius: 14,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 56,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  stopButton: {
    backgroundColor: colors.danger,
    borderRadius: 14,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 56,
  },
  stopButtonText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  newSessionButton: {
    borderRadius: 14,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 56,
  },

  // Live Session
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  liveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  liveDotDisconnected: {
    backgroundColor: colors.warning,
  },
  liveText: {
    color: colors.danger,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  liveTextDisconnected: {
    color: colors.warning,
  },
  timerText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  statusBar: {
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  statusText: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    textTransform: 'capitalize',
  },
  transcriptContainer: {
    flex: 1,
  },
  whisperContainer: {
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },

  // Debrief
  debriefContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  debriefStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  debriefStat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  debriefStatValue: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  debriefStatLabel: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  debriefSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    gap: spacing.sm,
  },
  debriefSectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  debriefText: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  debriefListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  debriefListText: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 20,
    flex: 1,
  },
});
