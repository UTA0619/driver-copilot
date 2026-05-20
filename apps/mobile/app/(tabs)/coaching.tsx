import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { capture } from '@/lib/analytics';
import { captureError } from '@/lib/sentry';
import { SkeletonCard } from '@/components/SkeletonCard';
import { getEarnedAchievements } from '@/services/gamificationService';
import { ACHIEVEMENTS } from '@/lib/achievements';
import type { CoachingInsight, InsightType, Achievement } from '@drivercopilot/types';

// ── Config ─────────────────────────────────────────────────────

const INSIGHT_ICONS: Record<InsightType, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  timing_suggestion:          { icon: 'time-outline',      color: '#3b82f6' },
  zone_suggestion:            { icon: 'location-outline',  color: '#22c55e' },
  earnings_trend:             { icon: 'trending-up-outline', color: '#f59e0b' },
  recommendation_follow_rate: { icon: 'bar-chart-outline', color: '#a78bfa' },
};

const MIN_DELIVERIES_FOR_INSIGHT = 5;

// ── Screen ─────────────────────────────────────────────────────

export default function CoachingScreen() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<CoachingInsight[]>([]);
  const [deliveryCount, setDeliveryCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [earnedAchievements, setEarnedAchievements] = useState<Achievement[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    // Fetch insights, delivery count, and achievements in parallel
    const [insightsResult, countResult, earned] = await Promise.all([
      supabase
        .from('coaching_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false })
        .limit(20),
      supabase
        .from('deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      getEarnedAchievements(user.id),
    ]);
    setEarnedAchievements(earned);

    if (insightsResult.error) {
      captureError(new Error(insightsResult.error.message), { source: 'CoachingScreen.fetch' });
    } else {
      setInsights(
        (insightsResult.data ?? []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          userId: r.user_id as string,
          weekStart: r.week_start as string,
          insightType: r.insight_type as InsightType,
          headline: r.headline as string,
          body: r.body as string,
          dataSnapshot: (r.data_snapshot as Record<string, unknown>) ?? {},
          createdAt: r.created_at as string,
        }))
      );
    }

    if (countResult.error) {
      captureError(new Error(countResult.error.message), { source: 'CoachingScreen.count' });
    } else {
      setDeliveryCount(countResult.count ?? 0);
    }

    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleInsightPress = useCallback((id: string, headline: string) => {
    setExpandedId(prev => prev === id ? null : id);
    capture('coaching_insight_viewed', { insight_id: id, headline });
  }, []);

  const needsMoreDeliveries =
    !loading && deliveryCount !== null && deliveryCount < MIN_DELIVERIES_FOR_INSIGHT;

  const earnedKeys = new Set(earnedAchievements.map(a => a.key));
  const lockedAchievements = Object.values(ACHIEVEMENTS).filter(a => !earnedKeys.has(a.key));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Coaching</Text>
        <Text style={styles.subtitle}>Personalized tips to earn more</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
          />
        }
      >
        {/* Achievements strip */}
        {!loading && earnedAchievements.length > 0 && (
          <View style={styles.achievementsSection}>
            <Text style={styles.achievementsTitle}>Your Achievements</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsRow}>
              {earnedAchievements.map(a => (
                <View key={a.key} style={styles.achievementBadge}>
                  <Text style={styles.achievementIcon}>{a.icon}</Text>
                  <Text style={styles.achievementName}>{a.title}</Text>
                </View>
              ))}
              {lockedAchievements.slice(0, 3).map(a => (
                <View key={a.key} style={[styles.achievementBadge, styles.achievementBadgeLocked]}>
                  <Text style={[styles.achievementIcon, styles.achievementIconLocked]}>🔒</Text>
                  <Text style={[styles.achievementName, styles.achievementNameLocked]}>{a.title}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Progress bar — shows delivery count toward unlocking insights */}
        {!loading && deliveryCount !== null && (
          <DeliveryProgress count={deliveryCount} target={MIN_DELIVERIES_FOR_INSIGHT} />
        )}

        {/* Loading state */}
        {loading && (
          <View style={{ gap: 16 }}>
            {[1, 2].map(i => (
              <View key={i} style={styles.skeletonCard}>
                <SkeletonCard width="60%" height={18} />
                <SkeletonCard width="100%" height={14} style={{ marginTop: 8 }} />
                <SkeletonCard width="80%" height={14} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
        )}

        {/* Empty state — not enough deliveries */}
        {needsMoreDeliveries && (
          <View style={styles.emptyCard}>
            <Ionicons name="bulb-outline" size={48} color="#334155" />
            <Text style={styles.emptyTitle}>Log more deliveries</Text>
            <Text style={styles.emptyText}>
              You have <Text style={styles.emptyHighlight}>{deliveryCount}</Text> of{' '}
              <Text style={styles.emptyHighlight}>{MIN_DELIVERIES_FOR_INSIGHT}</Text> deliveries needed to unlock your first coaching insight.
            </Text>
            <Text style={styles.emptyHint}>
              Insights update weekly every Monday.
            </Text>
          </View>
        )}

        {/* Insight cards */}
        {!loading && insights.length > 0 && (
          <View style={{ gap: 14 }}>
            {insights.map(insight => (
              <InsightCard
                key={insight.id}
                insight={insight}
                expanded={expandedId === insight.id}
                onPress={() => handleInsightPress(insight.id, insight.headline)}
              />
            ))}
          </View>
        )}

        {/* Has deliveries but no insights generated yet */}
        {!loading && !needsMoreDeliveries && insights.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="hourglass-outline" size={48} color="#334155" />
            <Text style={styles.emptyTitle}>Insights coming soon</Text>
            <Text style={styles.emptyText}>
              Your first insight will appear here on the next Monday after you have {MIN_DELIVERIES_FOR_INSIGHT}+ deliveries logged.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Delivery Progress ──────────────────────────────────────────

function DeliveryProgress({ count, target }: { count: number; target: number }) {
  const progress = Math.min(count / target, 1);
  const done = count >= target;

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>
          {done ? '✅ Insights unlocked' : `${count}/${target} deliveries to first insight`}
        </Text>
        <Text style={styles.progressCount}>{count}</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as `${number}%` }]} />
      </View>
    </View>
  );
}

// ── Insight Card ───────────────────────────────────────────────

function InsightCard({
  insight,
  expanded,
  onPress,
}: {
  insight: CoachingInsight;
  expanded: boolean;
  onPress: () => void;
}) {
  const config = INSIGHT_ICONS[insight.insightType];
  const weekDate = new Date(insight.weekStart).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  });

  return (
    <TouchableOpacity
      style={styles.insightCard}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Coaching insight: ${insight.headline}`}
      accessibilityState={{ expanded }}
    >
      <View style={styles.insightHeader}>
        <View style={[styles.insightIconBadge, { backgroundColor: config.color + '22' }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.insightMeta}>
          <Text style={styles.insightWeek}>Week of {weekDate}</Text>
          <Text style={styles.insightHeadline}>{insight.headline}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#475569"
        />
      </View>

      {expanded && (
        <View style={styles.insightBody}>
          <View style={styles.insightDivider} />
          <Text style={styles.insightBodyText}>{insight.body}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingHorizontal: 20, marginTop: 20, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#f8fafc' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 0 },

  skeletonCard: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#334155', marginBottom: 16,
  },

  progressCard: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#334155', marginBottom: 24, gap: 10,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 13, color: '#94a3b8', flex: 1 },
  progressCount: { fontSize: 22, fontWeight: '800', color: '#f8fafc' },
  progressBar: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 3 },

  emptyCard: {
    backgroundColor: '#1e293b', borderRadius: 20, padding: 36,
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#334155',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#64748b' },
  emptyText: { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 22 },
  emptyHighlight: { color: '#3b82f6', fontWeight: '700' },
  emptyHint: { fontSize: 12, color: '#334155', textAlign: 'center' },

  insightCard: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#334155',
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  insightIconBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightMeta: { flex: 1 },
  insightWeek: { fontSize: 11, color: '#475569', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  insightHeadline: { fontSize: 15, fontWeight: '700', color: '#f8fafc', marginTop: 2 },
  insightBody: { marginTop: 12 },
  insightDivider: { height: 1, backgroundColor: '#334155', marginBottom: 12 },
  insightBodyText: { fontSize: 14, color: '#94a3b8', lineHeight: 22 },

  achievementsSection: { marginBottom: 20 },
  achievementsTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  achievementsRow: { gap: 10, paddingRight: 20 },
  achievementBadge: { alignItems: 'center', gap: 6, backgroundColor: '#1e293b', borderRadius: 14, padding: 12, minWidth: 80, borderWidth: 1, borderColor: '#f59e0b22' },
  achievementBadgeLocked: { borderColor: '#334155', opacity: 0.5 },
  achievementIcon: { fontSize: 28 },
  achievementIconLocked: { opacity: 0.3 },
  achievementName: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },
  achievementNameLocked: { color: '#334155' },
});
