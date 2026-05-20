/**
 * useGamification — loads and caches goal, streak, and today's earnings
 * for the current user. Refreshes on mount and after deliveries are logged.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getGoal, getStreak } from '@/services/gamificationService';
import { captureError } from '@/lib/sentry';
import type { UserGoal, UserStreak } from '@drivercopilot/types';

interface GamificationState {
  goal: UserGoal;
  streak: UserStreak;
  todayEarnings: number;
  todayDeliveries: number;
  loading: boolean;
  refresh: () => void;
}

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  return start;
}

export function useGamification(): GamificationState {
  const { user } = useAuth();
  const [goal, setGoal] = useState<UserGoal>({ dailyTarget: 100, weeklyTarget: 500 });
  const [streak, setStreak] = useState<UserStreak>({ currentStreak: 0, longestStreak: 0, lastActiveDate: null, totalXp: 0, level: 1 });
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [g, s, deliveryResult] = await Promise.all([
        getGoal(user.id),
        getStreak(user.id),
        supabase
          .from('deliveries')
          .select('payout, tip')
          .eq('user_id', user.id)
          .gte('started_at', todayRange()),
      ]);
      setGoal(g);
      setStreak(s);
      if (!deliveryResult.error && deliveryResult.data) {
        const total = deliveryResult.data.reduce((s, d) => s + Number(d.payout) + Number(d.tip), 0);
        setTodayEarnings(total);
        setTodayDeliveries(deliveryResult.data.length);
      }
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), { source: 'useGamification' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return { goal, streak, todayEarnings, todayDeliveries, loading, refresh: load };
}
