/**
 * Gamification service — goals, streaks, achievements
 * All DB calls go through Supabase with RLS.
 */
import { supabase } from '@/lib/supabase';
import { captureError } from '@/lib/sentry';
import { capture } from '@/lib/analytics';
import { ACHIEVEMENTS } from '@/lib/achievements';
import type { UserGoal, UserStreak, AchievementKey, Achievement } from '@drivercopilot/types';

// ── Goals ──────────────────────────────────────────────────────

export async function getGoal(userId: string): Promise<UserGoal> {
  const { data } = await supabase
    .from('user_goals')
    .select('daily_target, weekly_target')
    .eq('user_id', userId)
    .single();
  return {
    dailyTarget: Number(data?.daily_target ?? 100),
    weeklyTarget: Number(data?.weekly_target ?? 500),
  };
}

export async function setGoal(userId: string, dailyTarget: number): Promise<void> {
  const { error } = await supabase
    .from('user_goals')
    .upsert({ user_id: userId, daily_target: dailyTarget }, { onConflict: 'user_id' });
  if (error) captureError(new Error(error.message), { source: 'gamificationService.setGoal' });
}

// ── Streaks ────────────────────────────────────────────────────

export async function getStreak(userId: string): Promise<UserStreak> {
  const { data } = await supabase
    .from('user_streaks')
    .select('current_streak, longest_streak, last_active_date, total_xp, level')
    .eq('user_id', userId)
    .single();
  return {
    currentStreak: data?.current_streak ?? 0,
    longestStreak: data?.longest_streak ?? 0,
    lastActiveDate: data?.last_active_date ?? null,
    totalXp: data?.total_xp ?? 0,
    level: data?.level ?? 1,
  };
}

export async function updateStreak(userId: string, xpGain = 10): Promise<{
  streak: UserStreak;
  streakExtended: boolean;
}> {
  const { data, error } = await supabase.rpc('upsert_user_streak', {
    p_user_id: userId,
    p_xp_gain: xpGain,
  });

  if (error) {
    captureError(new Error(error.message), { source: 'gamificationService.updateStreak' });
    return { streak: await getStreak(userId), streakExtended: false };
  }

  const row = data?.[0];
  return {
    streak: {
      currentStreak: row?.current_streak ?? 0,
      longestStreak: row?.longest_streak ?? 0,
      lastActiveDate: new Date().toISOString().split('T')[0],
      totalXp: row?.total_xp ?? 0,
      level: row?.level ?? 1,
    },
    streakExtended: row?.streak_extended ?? false,
  };
}

// ── Achievements ───────────────────────────────────────────────

export async function getEarnedAchievements(userId: string): Promise<Achievement[]> {
  const { data } = await supabase
    .from('user_achievements')
    .select('achievement_key, earned_at')
    .eq('user_id', userId);

  return (data ?? []).map(r => ({
    ...ACHIEVEMENTS[r.achievement_key as AchievementKey],
    earnedAt: r.earned_at,
  })).filter(Boolean);
}

export async function unlockAchievement(
  userId: string,
  key: AchievementKey
): Promise<Achievement | null> {
  const { error } = await supabase
    .from('user_achievements')
    .insert({ user_id: userId, achievement_key: key })
    .select()
    .single();

  if (error) {
    // Ignore unique violation (already earned)
    if (error.code === '23505') return null;
    captureError(new Error(error.message), { source: 'gamificationService.unlockAchievement' });
    return null;
  }

  const achievement = ACHIEVEMENTS[key];
  if (achievement) {
    capture('achievement_unlocked', { key, title: achievement.title });
    // Also grant XP for the achievement
    await supabase.rpc('upsert_user_streak', { p_user_id: userId, p_xp_gain: achievement.xpReward });
  }
  return achievement ?? null;
}

// ── Check achievements after a delivery is logged ─────────────
export async function checkDeliveryAchievements(
  userId: string,
  deliveryCount: number,
  earnings: number,
  platform: string,
  hourlyRate: number,
): Promise<Achievement[]> {
  const unlocked: Achievement[] = [];

  const tryUnlock = async (key: AchievementKey) => {
    const a = await unlockAchievement(userId, key);
    if (a) unlocked.push(a);
  };

  if (deliveryCount === 1) await tryUnlock('first_delivery');
  if (deliveryCount === 10) await tryUnlock('ten_deliveries');
  if (deliveryCount === 50) await tryUnlock('fifty_deliveries');
  if (earnings >= 100) await tryUnlock('first_hundred_day');
  if (hourlyRate >= 25) await tryUnlock('rate_chaser');

  const hour = new Date().getHours();
  if (hour < 8) await tryUnlock('early_bird');
  if (hour >= 22) await tryUnlock('night_owl');

  return unlocked;
}
