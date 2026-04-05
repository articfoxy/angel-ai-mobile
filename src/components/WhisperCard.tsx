import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../theme';
import type { WhisperCardData } from '../types';

interface WhisperCardProps {
  card: WhisperCardData;
  onDismiss: (id: string) => void;
  index: number;
}

const TYPE_CONFIG: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  suggestion: { icon: 'bulb', color: colors.primary },
  insight: { icon: 'eye', color: '#06b6d4' },
  action: { icon: 'flash', color: colors.warning },
  warning: { icon: 'warning', color: colors.danger },
  info: { icon: 'information-circle', color: colors.textSecondary },
};

export function WhisperCard({ card, onDismiss, index }: WhisperCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = TYPE_CONFIG[card.type] || TYPE_CONFIG.info;

  return (
    <View
      style={[
        styles.card,
        {
          transform: [{ translateY: index * -4 }],
          opacity: 1 - index * 0.15,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: config.color + '20' }]}>
          <Ionicons name={config.icon} size={16} color={config.color} />
        </View>
        <Text style={[styles.typeLabel, { color: config.color }]}>
          {card.type.toUpperCase()}
        </Text>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() => onDismiss(card.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.content}>{card.content}</Text>

      {card.detail && (
        <>
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Text style={styles.expandToggle}>
              {expanded ? 'Show less' : 'Show more'}
            </Text>
          </TouchableOpacity>
          {expanded && <Text style={styles.detail}>{card.detail}</Text>}
        </>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="thumbs-up-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="thumbs-down-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  typeLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  dismissButton: {
    padding: spacing.xs,
  },
  content: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  expandToggle: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  detail: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    padding: spacing.xs,
  },
});
