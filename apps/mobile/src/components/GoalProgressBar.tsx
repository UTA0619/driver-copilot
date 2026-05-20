/**
 * GoalProgressBar — shows today's earnings vs. daily target.
 * Animates the progress fill when earnings change.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props {
  current: number;
  target: number;
  deliveries: number;
}

export function GoalProgressBar({ current, target, deliveries }: Props) {
  const progress = Math.min(current / Math.max(target, 1), 1);
  const widthAnim = useRef(new Animated.Value(0)).current;
  const done = progress >= 1;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const remaining = Math.max(target - current, 0);
  const emoji = done ? '🎉' : progress >= 0.75 ? '🔥' : progress >= 0.5 ? '💪' : progress >= 0.25 ? '📈' : '🎯';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          <Text style={styles.emoji}>{emoji}</Text>
          <View>
            <Text style={styles.label}>Daily Goal</Text>
            <Text style={styles.subLabel}>
              {deliveries} {deliveries === 1 ? 'delivery' : 'deliveries'} today
            </Text>
          </View>
        </View>
        <View style={styles.rightGroup}>
          <Text style={styles.earned}>${current.toFixed(2)}</Text>
          <Text style={styles.target}>/ ${target.toFixed(0)}</Text>
        </View>
      </View>

      {/* Progress track */}
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: done ? '#22c55e' : progress >= 0.75 ? '#f59e0b' : '#3b82f6',
            },
          ]}
        />
      </View>

      <Text style={styles.statusText}>
        {done
          ? '🏆 Daily goal reached! Amazing work.'
          : `$${remaining.toFixed(2)} to go`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leftGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji: { fontSize: 28 },
  label: { fontSize: 14, fontWeight: '700', color: '#f8fafc' },
  subLabel: { fontSize: 11, color: '#475569', marginTop: 1 },
  rightGroup: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  earned: { fontSize: 22, fontWeight: '900', color: '#f8fafc' },
  target: { fontSize: 14, color: '#475569' },

  track: { height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },

  statusText: { fontSize: 12, color: '#64748b', textAlign: 'center' },
});
