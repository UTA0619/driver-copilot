import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getLevelTitle, xpForLevel, xpForNextLevel } from '@/lib/achievements';
import type { UserStreak } from '@drivercopilot/types';

interface Props {
  streak: UserStreak;
}

export function StreakDisplay({ streak }: Props) {
  const levelTitle = getLevelTitle(streak.level);
  const xpStart = xpForLevel(streak.level);
  const xpEnd = xpForNextLevel(streak.level);
  const xpProgress = Math.min((streak.totalXp - xpStart) / Math.max(xpEnd - xpStart, 1), 1);

  return (
    <View style={styles.container}>
      {/* Streak */}
      <View style={styles.statBox}>
        <Text style={styles.statIcon}>🔥</Text>
        <Text style={styles.statValue}>{streak.currentStreak}</Text>
        <Text style={styles.statLabel}>Day Streak</Text>
      </View>

      <View style={styles.divider} />

      {/* Level */}
      <View style={[styles.statBox, styles.levelBox]}>
        <Text style={styles.levelNum}>Lv.{streak.level}</Text>
        <Text style={styles.levelTitle}>{levelTitle}</Text>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${xpProgress * 100}%` as `${number}%` }]} />
        </View>
        <Text style={styles.xpText}>{streak.totalXp} XP</Text>
      </View>

      <View style={styles.divider} />

      {/* Best streak */}
      <View style={styles.statBox}>
        <Text style={styles.statIcon}>🏆</Text>
        <Text style={styles.statValue}>{streak.longestStreak}</Text>
        <Text style={styles.statLabel}>Best Streak</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 24, fontWeight: '900', color: '#f8fafc' },
  statLabel: { fontSize: 10, color: '#475569', fontWeight: '600', textTransform: 'uppercase' },

  divider: { width: 1, height: 50, backgroundColor: '#334155' },

  levelBox: { gap: 3 },
  levelNum: { fontSize: 18, fontWeight: '900', color: '#f59e0b' },
  levelTitle: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  xpTrack: { width: '80%', height: 4, backgroundColor: '#334155', borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  xpFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 2 },
  xpText: { fontSize: 10, color: '#475569' },
});
