import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { colors, spacing, fontSize } from '../theme';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import type { DashboardStatsResponse, StreakResponse, Session, SessionsListResponse, Mode } from '../types';

type TabParamList = {
  Dashboard: undefined;
  Memory: undefined;
  Session: { modeId?: string } | undefined;
  Digest: undefined;
  Settings: undefined;
};

const DEFAULT_MODES: Mode[] = [
  { modeId: 'meeting', name: 'Meeting', icon: 'people', description: 'Real-time meeting intelligence' },
  { modeId: 'translator', name: 'Translator', icon: 'language', description: 'Live translation assistance' },
  { modeId: 'think', name: 'Think', icon: 'bulb', description: 'Brainstorm with AI' },
  { modeId: 'sales', name: 'Sales', icon: 'trending-up', description: 'Close deals with AI coaching' },
  { modeId: 'learning', name: 'Learning', icon: 'school', description: 'Learn faster with AI insights' },
  { modeId: 'coach', name: 'Coach', icon: 'fitness', description: 'Personal performance coaching' },
  { modeId: 'builder', name: 'Builder', icon: 'construct', description: 'Build better with AI assistance' },
];

const MODE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Meeting: 'people',
  Translator: 'language',
  Think: 'bulb',
  Sales: 'trending-up',
  Learning: 'school',
  Coach: 'fitness',
  Builder: 'construct',
};

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();

  const {
    data: statsResponse,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useApi<DashboardStatsResponse>('stats/dashboard');

  const {
    data: streakResponse,
    isLoading: streakLoading,
    refetch: refetchStreak,
  } = useApi<StreakResponse>('engagement/streak');

  const {
    data: sessionsResponse,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useApi<SessionsListResponse>('sessions?limit=5');

  const {
    data: modes,
    refetch: refetchModes,
  } = useApi<Mode[]>('modes');

  // Unwrap backend response shapes
  const streak = streakResponse ?? statsResponse?.streak;
  const sessions = sessionsResponse?.sessions;
  const stats = statsResponse;

  const isLoading = statsLoading || streakLoading || sessionsLoading;
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchStreak(), refetchSessions(), refetchModes()]);
    setRefreshing(false);
  }, [refetchStats, refetchStreak, refetchSessions, refetchModes]);

  const displayModes = modes || DEFAULT_MODES;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleModePress = (mode: Mode) => {
    navigation.navigate('Session', { modeId: mode.modeId });
  };

  const formatDuration = (session: Session) => {
    if (!session.endedAt || !session.startedAt) return '--';
    const ms = new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime();
    if (ms <= 0) return '--';
    const mins = Math.floor(ms / 60000);
    return `${mins}m`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
          </Text>
          <Text style={styles.appTitle}>Angel AI</Text>
        </View>
      </View>

      {isLoading && !statsResponse ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Stat Cards */}
          <View style={styles.statsRow}>
            <StatCard
              label="Streak"
              value={streak?.currentStreak ?? 0}
              color={colors.warning}
            />
            <StatCard
              label="Saves"
              value={streak?.totalSaves ?? 0}
              color={colors.success}
            />
            <StatCard
              label="Memories"
              value={stats?.memoryStats?.total ?? 0}
              color={colors.primary}
            />
          </View>

          {/* Memory Growth */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Memory Growth</Text>
            <View style={styles.growthCard}>
              <Ionicons name="trending-up" size={20} color={colors.success} />
              <Text style={styles.growthText}>
                {stats?.memoryStats?.total ?? 0} total memories created
              </Text>
            </View>
          </View>

          {/* Mode Shortcuts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Start</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modesScroll}
            >
              {displayModes.map((mode) => {
                const iconName = MODE_ICONS[mode.name] || 'ellipse';
                return (
                  <TouchableOpacity
                    key={mode.modeId}
                    style={styles.modeCard}
                    onPress={() => handleModePress(mode)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modeCardIcon}>
                      <Ionicons name={iconName} size={22} color={colors.primary} />
                    </View>
                    <Text style={styles.modeCardName}>{mode.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Recent Sessions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            {Array.isArray(sessions) && sessions.length > 0 ? (
              sessions.map((session) => (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionModeBadge}>
                      <Text style={styles.sessionModeText}>
                        {session.modeId || session.mode || 'Session'}
                      </Text>
                    </View>
                    <Text style={styles.sessionDuration}>
                      {formatDuration(session)}
                    </Text>
                  </View>
                  <Text style={styles.sessionDate}>
                    {new Date(session.startedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                  {session.summary != null && (
                    <Text style={styles.sessionSummary} numberOfLines={2}>
                      {typeof session.summary === 'string' ? session.summary : String(JSON.stringify(session.summary))}
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="mic-outline" size={32} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No recent sessions</Text>
                <Text style={styles.emptySubtext}>Start a session to see it here</Text>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  greeting: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  appTitle: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  growthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  growthText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  modesScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  modeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: 88,
    height: 88,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  modeCardName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  sessionCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sessionModeBadge: {
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sessionModeText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  sessionDuration: {
    color: colors.textTertiary,
    fontSize: fontSize.sm,
  },
  sessionDate: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  sessionSummary: {
    color: colors.textTertiary,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  emptySubtext: {
    color: colors.textTertiary,
    fontSize: fontSize.md,
  },
});
