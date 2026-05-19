import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Pulsing skeleton placeholder for loading states.
 * Replaces static "—" placeholders while data is being fetched.
 */
export function SkeletonCard({ width = '100%', height = 20, borderRadius = 8, style }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as number, height, borderRadius, opacity },
        style,
      ]}
      accessibilityLabel="Loading…"
      accessibilityRole="progressbar"
    />
  );
}

/** Convenience: a row of skeletons for table-like content */
export function SkeletonRow({ children }: { children?: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#334155',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
});
