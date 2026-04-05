import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../theme';
import { api } from '../services/api';
import type { Digest } from '../types';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function DigestScreen() {
  const insets = useSafeAreaInsets();
  const [digest, setDigest] = useState<Digest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchDigest = useCallback(async (date: Date) => {
    setIsLoading(true);
    setError(null);
    try {
      const dateStr = toDateString(date);
      const today = toDateString(new Date());
      const endpoint = dateStr === today ? 'digest/today' : `digest/${dateStr}`;
      const data = await api.get<Digest>(endpoint);
      setDigest(data);
    } catch {
      setDigest(null);
      setError('No digest available for this date');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDigest(currentDate);
  }, [currentDate, fetchDigest]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDigest(currentDate);
    setRefreshing(false);
  }, [currentDate, fetchDigest]);

  const goToPreviousDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    const today = new Date();
    if (next <= today) {
      setCurrentDate(next);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = toDateString(currentDate) === toDateString(new Date());

  const renderContent = (content: string) => {
    // Simple markdown-like rendering
    const lines = content.split('\n');
    return lines.map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <View key={index} style={styles.lineBreak} />;

      // Headers
      if (trimmed.startsWith('### ')) {
        return (
          <Text key={index} style={styles.h3}>
            {trimmed.replace('### ', '')}
          </Text>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <Text key={index} style={styles.h2}>
            {trimmed.replace('## ', '')}
          </Text>
        );
      }
      if (trimmed.startsWith('# ')) {
        return (
          <Text key={index} style={styles.h1}>
            {trimmed.replace('# ', '')}
          </Text>
        );
      }

      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        return (
          <View key={index} style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bodyText}>{trimmed.slice(2)}</Text>
          </View>
        );
      }

      // Regular text
      return (
        <Text key={index} style={styles.bodyText}>
          {trimmed}
        </Text>
      );
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Daily Digest</Text>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={goToPreviousDay} style={styles.navButton}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToToday} style={styles.dateButton}>
          <Text style={styles.dateText}>{formatDate(currentDate)}</Text>
          {isToday && <Text style={styles.todayBadge}>Today</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goToNextDay}
          style={[styles.navButton, isToday && styles.navButtonDisabled]}
          disabled={isToday}
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={isToday ? colors.textTertiary : colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : digest ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Digest Sections */}
          {digest.sections && digest.sections.length > 0 ? (
            digest.sections.map((section, index) => (
              <View key={index} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.sectionContent}>
                  {renderContent(section.content)}
                </View>
              </View>
            ))
          ) : digest.content ? (
            <View style={styles.section}>
              <View style={styles.sectionContent}>
                {renderContent(digest.content)}
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="newspaper-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No digest available</Text>
          <Text style={styles.emptySubtext}>
            {error || 'Check back after your next session'}
          </Text>
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
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  dateButton: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  todayBadge: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sectionContent: {
    gap: spacing.xs,
  },
  h1: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  h2: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  h3: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  bodyText: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  bulletItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  bullet: {
    color: colors.primary,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  lineBreak: {
    height: spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
