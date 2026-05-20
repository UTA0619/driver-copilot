/**
 * AchievementToast — slides down from the top when an achievement is unlocked.
 * Auto-dismisses after 3.5 seconds.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import type { Achievement } from '@drivercopilot/types';

interface Props {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export function AchievementToast({ achievement, onDismiss }: Props) {
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!achievement) return;

    // Slide in
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Auto dismiss after 3.5s
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -120, duration: 300, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 3500);

    return () => clearTimeout(timer);
  }, [achievement]);

  if (!achievement) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`Achievement unlocked: ${achievement.title}`}
    >
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{achievement.icon}</Text>
      </View>
      <View style={styles.textBox}>
        <Text style={styles.label}>🏅 Achievement Unlocked!</Text>
        <Text style={styles.title}>{achievement.title}</Text>
        <Text style={styles.desc}>{achievement.description}</Text>
      </View>
      <View style={styles.xpBadge}>
        <Text style={styles.xpText}>+{achievement.xpReward} XP</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#1c1000',
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 26 },
  textBox: { flex: 1, gap: 2 },
  label: { fontSize: 10, color: '#f59e0b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: 15, color: '#f8fafc', fontWeight: '800' },
  desc: { fontSize: 12, color: '#64748b' },
  xpBadge: { backgroundColor: '#f59e0b', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  xpText: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
});
