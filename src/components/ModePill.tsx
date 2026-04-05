import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../theme';

interface ModePillProps {
  name: string;
  icon?: string;
  isActive?: boolean;
}

const MODE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Meeting: 'people',
  Translator: 'language',
  Think: 'bulb',
  Sales: 'trending-up',
  Learning: 'school',
  Coach: 'fitness',
  Builder: 'construct',
};

export function ModePill({ name, isActive = false }: ModePillProps) {
  const iconName = MODE_ICONS[name] || 'ellipse';

  return (
    <View style={[styles.pill, isActive && styles.pillActive]}>
      <Ionicons
        name={iconName}
        size={14}
        color={isActive ? colors.text : colors.textSecondary}
      />
      <Text style={[styles.text, isActive && styles.textActive]}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  text: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  textActive: {
    color: colors.text,
  },
});
