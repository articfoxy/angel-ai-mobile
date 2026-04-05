import React, { useEffect, useState, useCallback } from 'react';
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
  { id: 'meeting', name: 'Meeting', description: 'Real-time meeting intelligence with action items and key decisions', icon: 'people', slug: 'meeting' },
  { id: 'translator', name: 'Translator', description: 'Real-time language translation and interpretation', icon: 'language', slug: 'translator' },
  { id: 'think', name: 'Think', description: 'Thought partner for brainstorming and problem solving', icon: 'bulb', slug: 'think' },
  { id: 'sales', name: 'Sales', description: 'Live sales coaching with objection handling', icon: 'trending-up', slug: 'sales' },
  { id: 'learning', name: 'Learning', description: 'Learning assistant with contextual explanations', icon: 'school', slug: 'learning' },
  { id: 'coach', name: 'Coach', description: 'Personal communication and leadership coaching', icon: 'fitness', slug: 'coach' },
  { id: 'builder', name: 'Builder', description: 'Build and refine ideas through conversation', icon: 'construct', slug: 'builder' },
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
  } = useSession(socket);

  const { data: apiModes } = useApi<Mode[]>('modes');
  const modes = apiModes || DEFAULT_MODES;
  const [isStarting, setIsStarting] = useState(false);

  // Connect socket once on mount
  const connectAttemptedRef = React.useRef(false);
  useEffect(() => {
    if (!connectAttemptedRef.current && !isConnected) {
      connectAttemptedRef.current = true;
      connect();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle incoming modeId from navigation
  useEffect(() => {
    const modeId = route.params?.modeId;
    if (modeId && phase === 'mode-select') {
      const mode = modes.find((m) => m.id === modeId);
      if (mode) {
        selectMode(mode);
      }
    }
  }, [route.params?.modeId, modes, phase, selectMode]);

  const handleStart = useCallback(async () => {
    if (!selectedMode) {
      Alert.alert('Select a Mode', 'Please select a conversation mode to begin.');
      return;
    }

    setIsStarting(true);

    try {
      const granted = await requestMicPermission();
      if (!granted) {
        Alert.alert(
          'Microphone Access Required',
          'Angel AI needs microphone access to capture audio. Please enable it in Settings.',
        );
        setIsStarting(false);
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await startSession();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start session';
      Alert.alert('Error', message);
    } finally {
      setIsStarting(false);
    }
  }, [selectedMode, startSession]);

  const handleStop = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await stopSession();
  }, [stopSession]);

  const handleNewSession = useCallback(() => {
    resetSession();
  }, [resetSession]);

  const handleWhisperFeedback = useCallback((whisperId: string, feedback: 'positive' | 'negative') => {
    if (socket) {
      socket.emit('whisper:feedback', { whisperId, feedback });
    }
  }, [socket]);

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
            onSelect={selectMode}
          />
        </ScrollView>

        {selectedMode && (
          <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <TouchableOpacity
              style={[styles.startButton, isStarting && styles.buttonDisabled]}
              onPress={handleStart}
              disabled={isStarting}
              activeOpacity={0.8}
            >
              {isStarting ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <Ionicons name="mic" size={22} color={colors.text} />
                  <Text style={styles.startButtonText}>
                    Start {selectedMode.name} Session
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // --- RENDER: Live Session ---
  if (phase === 'live') {
    const visibleWhispers = whisperCards.slice(-3).reverse();

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Live Header */}
        <View style={styles.liveHeader}>
          <View style={styles.liveHeaderLeft}>
            {selectedMode && <ModePill name={selectedMode.name} isActive />}
          </View>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
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
          style={styles.newSessionButton}
          onPress={handleNewSession}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={colors.text} />
          <Text style={styles.startButtonText}>New Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Debrief sub-component
function DebriefView({ debrief }: { debrief: Debrief }) {
  return (
    <View style={styles.debriefContainer}>
      {/* Stats Row */}
      <View style={styles.debriefStats}>
        <View style={styles.debriefStat}>
          <Text style={styles.debriefStatValue}>
            {Math.floor(debrief.duration / 60)}m
          </Text>
          <Text style={styles.debriefStatLabel}>Duration</Text>
        </View>
        <View style={styles.debriefStat}>
          <Text style={styles.debriefStatValue}>{debrief.memoriesCreated}</Text>
          <Text style={styles.debriefStatLabel}>Memories</Text>
        </View>
        <View style={styles.debriefStat}>
          <Text style={styles.debriefStatValue}>{debrief.highlights.length}</Text>
          <Text style={styles.debriefStatLabel}>Highlights</Text>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.debriefSection}>
        <Text style={styles.debriefSectionTitle}>Summary</Text>
        <Text style={styles.debriefText}>{debrief.summary}</Text>
      </View>

      {/* Highlights */}
      {debrief.highlights.length > 0 && (
        <View style={styles.debriefSection}>
          <Text style={styles.debriefSectionTitle}>Highlights</Text>
          {debrief.highlights.map((highlight, index) => (
            <View key={index} style={styles.debriefListItem}>
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text style={styles.debriefListText}>{highlight}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Items */}
      {debrief.actionItems.length > 0 && (
        <View style={styles.debriefSection}>
          <Text style={styles.debriefSectionTitle}>Action Items</Text>
          {debrief.actionItems.map((item, index) => (
            <View key={index} style={styles.debriefListItem}>
              <Ionicons name="checkbox-outline" size={14} color={colors.primary} />
              <Text style={styles.debriefListText}>{item}</Text>
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.primary,
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
  liveText: {
    color: colors.danger,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
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
    borderWidth: 1,
    borderColor: colors.border,
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
    borderWidth: 1,
    borderColor: colors.border,
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
