import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { colors, spacing, fontSize } from '../theme';

export function ThinkingIndicator() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const animation = (delay: number) =>
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withTiming(0.3, { duration: 400 })
          ),
          -1,
          false
        )
      );

    dot1.value = animation(0);
    dot2.value = animation(150);
    dot3.value = animation(300);
  }, [dot1, dot2, dot3]);

  const animStyle1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const animStyle2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const animStyle3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        <Animated.View style={[styles.dot, animStyle1]} />
        <Animated.View style={[styles.dot, animStyle2]} />
        <Animated.View style={[styles.dot, animStyle3]} />
      </View>
      <Text style={styles.label}>Angel is thinking...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
});
