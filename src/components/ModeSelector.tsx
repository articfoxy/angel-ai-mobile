import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../theme';
import type { Mode } from '../types';

interface ModeSelectorProps {
  modes: Mode[];
  selectedMode: Mode | null;
  onSelect: (mode: Mode) => void;
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

export function ModeSelector({ modes, selectedMode, onSelect }: ModeSelectorProps) {
  return (
    <View style={styles.grid}>
      {modes.map((mode) => {
        const isSelected = selectedMode?.id === mode.id;
        const iconName = MODE_ICONS[mode.name] || 'ellipse';

        return (
          <TouchableOpacity
            key={mode.id}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelect(mode)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
              <Ionicons
                name={iconName}
                size={24}
                color={isSelected ? colors.text : colors.primary}
              />
            </View>
            <Text style={[styles.modeName, isSelected && styles.modeNameSelected]}>
              {mode.name}
            </Text>
            <Text style={styles.modeDescription} numberOfLines={2}>
              {mode.description}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 0,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHover,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconContainerSelected: {
    backgroundColor: colors.primary,
  },
  modeName: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  modeNameSelected: {
    color: colors.primaryHover,
  },
  modeDescription: {
    color: colors.textTertiary,
    fontSize: fontSize.sm,
    lineHeight: 16,
  },
});
