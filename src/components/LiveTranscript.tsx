import React, { useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../theme';
import type { TranscriptSegment } from '../types';

interface LiveTranscriptProps {
  segments: TranscriptSegment[];
}

const SPEAKER_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
];

function getSpeakerColor(speaker?: string): string {
  if (!speaker) return colors.textSecondary;
  const index = speaker.charCodeAt(0) % SPEAKER_COLORS.length;
  return SPEAKER_COLORS[index];
}

function SegmentItem({ item }: { item: TranscriptSegment }) {
  return (
    <View style={styles.segment}>
      {item.speaker && (
        <Text style={[styles.speaker, { color: getSpeakerColor(item.speaker) }]}>
          {item.speaker}
        </Text>
      )}
      <Text style={[styles.text, !item.isFinal && styles.textInterim]}>
        {item.text}
      </Text>
    </View>
  );
}

export function LiveTranscript({ segments }: LiveTranscriptProps) {
  const flatListRef = useRef<FlatList<TranscriptSegment>>(null);

  useEffect(() => {
    if (segments.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [segments.length]);

  if (segments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Listening...</Text>
        <Text style={styles.emptySubtext}>Transcript will appear here</Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={segments}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <SegmentItem item={item} />}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  segment: {
    paddingVertical: spacing.xs,
  },
  speaker: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  text: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  textInterim: {
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    color: colors.textTertiary,
    fontSize: fontSize.md,
  },
});
