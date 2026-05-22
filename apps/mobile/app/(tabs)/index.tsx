import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOfferCapture } from '@/hooks/useOfferCapture';
import { useGamification } from '@/hooks/useGamification';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { capture } from '@/lib/analytics';
import { hapticSuccess, hapticLight, hapticForRecommendation } from '@/lib/haptics';
import { unlockAchievement } from '@/services/gamificationService';
import { GoalProgressBar } from '@/components/GoalProgressBar';
import { StreakDisplay } from '@/components/StreakDisplay';
import { AchievementToast } from '@/components/AchievementToast';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import type { OfferDecision, DeliveryPlatform, Achievement } from '@drivercopilot/types';

// ── Constants ─────────────────────────────────────────────────

const PLATFORM_OPTIONS = [
  { key: 'uber_eats' as DeliveryPlatform,  label: 'Uber Eats', color: '#16a34a' },
  { key: 'doordash' as DeliveryPlatform,   label: 'DoorDash',  color: '#dc2626' },
  { key: 'grubhub' as DeliveryPlatform,    label: 'Grubhub',   color: '#ea580c' },
  { key: 'instacart' as DeliveryPlatform,  label: 'Instacart', color: '#22c55e' },
] as const;

const STATUS_LABELS: Record<string, string> = {
  picking: 'Opening photos…',
  compressing: 'Preparing image…',
  parsing: 'Analyzing offer…',
};

const REC_CONFIG = {
  accept:      { label: 'ACCEPT',   color: '#22c55e', bg: '#052e16', icon: 'checkmark-circle' as const },
  decline:     { label: 'DECLINE',  color: '#ef4444', bg: '#450a0a', icon: 'close-circle'     as const },
  conditional: { label: 'CONSIDER', color: '#f59e0b', bg: '#1c1000', icon: 'help-circle'      as const },
};

const RECENT_STORAGE_KEY = 'dc_recent_analyses';
const FREE_MONTHLY_LIMIT = 10;

function monthlyCountKey(): string {
  const d = new Date();
  return `dc_monthly_analyses_${d.getFullYear()}_${d.getMonth()}`;
}

interface RecentAnalysis {
  recommendation: 'accept' | 'decline' | 'conditional';
  effectiveHourlyRate: number;
  payout: number;
  platform: DeliveryPlatform;
  analyzedAt: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Working late! 🌙';
  if (h < 12) return 'Good morning! ☀️';
  if (h < 17) return 'Good afternoon! 🌤';
  if (h < 21) return 'Good evening! 🌆';
  return 'Night shift! 🌃';
}

// ── Main Screen ───────────────────────────────────────────────

export default function OffersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ capturedBase64?: string; capturedPlatform?: string }>();
  const { user } = useAuth();
  const { status, result, analyzeOffer, analyzeFromBase64, reset } = useOfferCapture();
  const { goal, streak, todayEarnings, todayDeliveries, loading: gamLoading, refresh: refreshGam } = useGamification();
  const { isPro } = useSubscriptionContext();
  const analyzingRef = useRef(false);
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
  const [monthlyCount, setMonthlyCount] = useState(0);

  // Load recent analyses + monthly usage count from local storage
  useEffect(() => {
    AsyncStorage.getItem(RECENT_STORAGE_KEY)
      .then(raw => { if (raw) setRecentAnalyses(JSON.parse(raw)); })
      .catch(() => {});
    AsyncStorage.getItem(monthlyCountKey())
      .then(raw => { if (raw) setMonthlyCount(parseInt(raw, 10) || 0); })
      .catch(() => {});
  }, []);

  const incrementMonthlyCount = useCallback(async () => {
    const next = monthlyCount + 1;
    setMonthlyCount(next);
    await AsyncStorage.setItem(monthlyCountKey(), String(next)).catch(() => {});
  }, [monthlyCount]);

  const atFreeLimit = !isPro && monthlyCount >= FREE_MONTHLY_LIMIT;
  const nearFreeLimit = !isPro && monthlyCount >= FREE_MONTHLY_LIMIT - 2 && monthlyCount < FREE_MONTHLY_LIMIT;

  // Handle camera-captured image coming back via route params
  useEffect(() => {
    if (params.capturedBase64 && params.capturedPlatform && !analyzingRef.current) {
      analyzingRef.current = true;
      analyzeFromBase64(
        params.capturedBase64,
        params.capturedPlatform as DeliveryPlatform,
      ).finally(() => { analyzingRef.current = false; });
    }
  }, [params.capturedBase64, params.capturedPlatform]);

  // Fire haptic when result arrives + save to recent
  useEffect(() => {
    if (status === 'done' && result?.decision) {
      hapticForRecommendation(result.decision.recommendation);
      // Save to recent analyses
      const entry: RecentAnalysis = {
        recommendation: result.decision.recommendation,
        effectiveHourlyRate: result.decision.effectiveHourlyRate,
        payout: result.decision.parsedOffer.payout,
        platform: result.decision.parsedOffer.platform,
        analyzedAt: new Date().toISOString(),
      };
      setRecentAnalyses(prev => {
        const next = [entry, ...prev].slice(0, 5);
        AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    }
  }, [status, result]);

  const handleAnalyze = useCallback(async (platform: DeliveryPlatform) => {
    if (analyzingRef.current) return;
    if (atFreeLimit) { hapticLight(); router.push('/paywall'); return; }
    analyzingRef.current = true;
    hapticLight();
    try {
      await analyzeOffer(platform);
      await incrementMonthlyCount();
      if (user) {
        const a = await unlockAchievement(user.id, 'first_analysis');
        if (a) setPendingAchievement(a);
      }
    } finally {
      analyzingRef.current = false;
    }
  }, [analyzeOffer, user, atFreeLimit, incrementMonthlyCount, router]);

  const handleCameraOpen = useCallback(() => {
    if (atFreeLimit) { hapticLight(); router.push('/paywall'); return; }
    hapticLight();
    router.push('/capture');
  }, [router, atFreeLimit]);

  const isLoading = ['picking', 'compressing', 'parsing'].includes(status);

  // Result screen
  if (status === 'done' && result?.decision) {
    return (
      <>
        <ResultView
          decision={result.decision}
          latencyMs={result.latencyMs}
          onReset={() => { reset(); refreshGam(); }}
          userId={user?.id ?? ''}
          onAchievement={setPendingAchievement}
        />
        <AchievementToast achievement={pendingAchievement} onDismiss={() => setPendingAchievement(null)} />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AchievementToast achievement={pendingAchievement} onDismiss={() => setPendingAchievement(null)} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.title}>Driver Copilot</Text>
          </View>
          <TouchableOpacity
            style={styles.proBtn}
            onPress={() => { hapticLight(); router.push('/paywall'); }}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Pro"
          >
            <Ionicons name="flash" size={14} color="#f59e0b" />
            <Text style={styles.proBtnText}>Pro</Text>
          </TouchableOpacity>
        </View>

        {/* Goal progress */}
        {!gamLoading && (
          <GoalProgressBar current={todayEarnings} target={goal.dailyTarget} deliveries={todayDeliveries} />
        )}

        {/* Streak & XP */}
        {!gamLoading && (
          <StreakDisplay streak={streak} />
        )}

        {/* Loading state */}
        {isLoading ? (
          <View style={styles.loadingCard} accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>{STATUS_LABELS[status] ?? 'Analyzing…'}</Text>
            <Text style={styles.loadingHint}>This usually takes 2–3 seconds</Text>
          </View>
        ) : (
          <>
            {/* Monthly usage banner — free tier warning / limit */}
            {atFreeLimit ? (
              <TouchableOpacity
                style={styles.limitBanner}
                onPress={() => { hapticLight(); router.push('/paywall'); }}
                accessibilityRole="button"
              >
                <Ionicons name="lock-closed" size={16} color="#f59e0b" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.limitBannerTitle}>Monthly limit reached</Text>
                  <Text style={styles.limitBannerSub}>10/10 free analyses used · Upgrade for unlimited</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
              </TouchableOpacity>
            ) : nearFreeLimit ? (
              <View style={styles.warningBanner}>
                <Ionicons name="warning-outline" size={15} color="#f59e0b" />
                <Text style={styles.warningBannerText}>
                  {FREE_MONTHLY_LIMIT - monthlyCount} free {FREE_MONTHLY_LIMIT - monthlyCount === 1 ? 'analysis' : 'analyses'} left this month
                </Text>
              </View>
            ) : null}

            {/* PRIMARY CTA — Camera scan button */}
            <TouchableOpacity
              style={[styles.scanButton, atFreeLimit && styles.scanButtonLocked]}
              onPress={handleCameraOpen}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Scan offer with camera"
              accessibilityHint="Opens camera to capture and analyze an offer directly"
            >
              <View style={styles.scanButtonIcon}>
                <Ionicons name="camera" size={32} color="#fff" />
              </View>
              <View style={styles.scanButtonText}>
                <Text style={styles.scanButtonTitle}>Scan Offer</Text>
                <Text style={styles.scanButtonSub}>Point camera at offer screen — instant analysis</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>

            {/* OR divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or use photo library</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Platform photo-library buttons */}
            <View style={styles.platformGrid}>
              {PLATFORM_OPTIONS.map(({ key, label, color }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.platformButton, { borderColor: color + '88' }]}
                  onPress={() => handleAnalyze(key)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Analyze ${label} screenshot from photo library`}
                >
                  <View style={[styles.platformDot, { backgroundColor: color }]} />
                  <Text style={[styles.platformLabel, { color }]}>{label}</Text>
                  <Ionicons name="image-outline" size={15} color={color + 'aa'} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Error state */}
            {status === 'error' && (
              <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
                <Ionicons name="alert-circle-outline" size={18} color="#f87171" />
                <Text style={styles.errorBannerText}>Analysis failed. Please try again.</Text>
              </View>
            )}

            {/* Recent analyses */}
            {recentAnalyses.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>Recent Analyses</Text>
                {recentAnalyses.map((r, i) => {
                  const cfg = REC_CONFIG[r.recommendation];
                  const platform = PLATFORM_OPTIONS.find(p => p.key === r.platform);
                  const time = new Date(r.analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <View key={i} style={styles.recentRow}>
                      <View style={[styles.recentBadge, { backgroundColor: cfg.color + '22' }]}>
                        <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                      </View>
                      <View style={styles.recentInfo}>
                        <Text style={[styles.recentRec, { color: cfg.color }]}>{cfg.label}</Text>
                        <Text style={styles.recentMeta}>
                          ${r.payout.toFixed(2)} · {platform?.label ?? r.platform} · {time}
                        </Text>
                      </View>
                      <Text style={styles.recentRate}>${r.effectiveHourlyRate.toFixed(0)}/hr</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Result Card ───────────────────────────────────────────────

function ResultView({
  decision, latencyMs, onReset, userId, onAchievement,
}: {
  decision: OfferDecision;
  latencyMs: number;
  onReset: () => void;
  userId: string;
  onAchievement: (a: Achievement) => void;
}) {
  const cfg = REC_CONFIG[decision.recommendation];
  const { parsedOffer } = decision;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cfg.bg }]} edges={['top']}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.resultHeader}>
            <Ionicons name={cfg.icon} size={60} color={cfg.color} />
            <Text style={[styles.recommendationLabel, { color: cfg.color }]} accessibilityRole="header">
              {cfg.label}
            </Text>
            <Text style={[styles.hourlyRate, { color: cfg.color }]}>
              ${decision.effectiveHourlyRate.toFixed(2)}/hr
            </Text>
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Offer Details</Text>
            <DetailRow label="Payout" value={`$${parsedOffer.payout.toFixed(2)}`} />
            <DetailRow label="Distance" value={`${parsedOffer.distanceMiles.toFixed(1)} mi`} />
            <DetailRow label="Est. time" value={`${parsedOffer.estimatedMinutes} min`} />
            {parsedOffer.storeName
              ? <DetailRow label="From" value={parsedOffer.storeName} last />
              : <DetailRow label="Platform" value={parsedOffer.platform.replace('_', ' ')} last />
            }
          </View>

          <View style={styles.reasoningCard}>
            <Text style={styles.detailsTitle}>Why</Text>
            {decision.reasoning.map(reason => (
              <Text key={reason} style={styles.reasoningItem}>• {reason}</Text>
            ))}
          </View>

          <OfferFeedback decision={decision} userId={userId} onAchievement={onAchievement} />

          <Text style={styles.meta}>
            Confidence: {decision.confidence} · {(latencyMs / 1000).toFixed(1)}s
          </Text>

          <TouchableOpacity
            style={styles.analyzeAnotherButton}
            onPress={onReset}
            accessibilityRole="button"
          >
            <Ionicons name="camera-outline" size={18} color="#94a3b8" />
            <Text style={styles.analyzeAnotherText}>Analyze Another Offer</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Offer Feedback ────────────────────────────────────────────

function OfferFeedback({ decision, userId, onAchievement }: { decision: OfferDecision; userId: string; onAchievement: (a: Achievement) => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFeedback = useCallback(async (accepted: boolean) => {
    if (submitted || !userId) return;
    setSubmitting(true);
    const { error } = await supabase.from('deliveries').insert({
      user_id: userId,
      platform: decision.parsedOffer.platform,
      payout: decision.parsedOffer.payout,
      tip: 0,
      distance_miles: decision.parsedOffer.distanceMiles,
      duration_minutes: decision.parsedOffer.estimatedMinutes,
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      accepted_recommendation: accepted,
    });
    setSubmitting(false);
    if (!error) {
      setSubmitted(true);
      capture('offer_feedback_submitted', { accepted, recommendation: decision.recommendation });
      if (accepted) {
        hapticSuccess();
        const a = await unlockAchievement(userId, 'first_accept');
        if (a) onAchievement(a);
        if (decision.effectiveHourlyRate >= 25) {
          const a2 = await unlockAchievement(userId, 'rate_chaser');
          if (a2) onAchievement(a2);
        }
      } else {
        hapticLight();
      }
    }
  }, [userId, decision, submitted, onAchievement]);

  if (submitted) {
    return (
      <View style={feedbackStyles.container}>
        <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
        <Text style={feedbackStyles.submitted}>Logged! Check your Earnings tab.</Text>
      </View>
    );
  }
  return (
    <View style={feedbackStyles.container}>
      <Text style={feedbackStyles.question}>Did you take this offer?</Text>
      <View style={feedbackStyles.buttons}>
        <TouchableOpacity style={[feedbackStyles.btn, feedbackStyles.btnYes]} onPress={() => handleFeedback(true)} disabled={submitting} accessibilityRole="button" accessibilityLabel="Yes">
          <Text style={feedbackStyles.btnText}>✓ Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[feedbackStyles.btn, feedbackStyles.btnNo]} onPress={() => handleFeedback(false)} disabled={submitting} accessibilityRole="button" accessibilityLabel="No">
          <Text style={feedbackStyles.btnText}>✗ No</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const feedbackStyles = StyleSheet.create({
  container: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, marginBottom: 12, alignItems: 'center', gap: 12 },
  question: { fontSize: 15, color: '#94a3b8', fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 12, width: '100%' },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnYes: { backgroundColor: '#052e16', borderWidth: 1, borderColor: '#22c55e' },
  btnNo: { backgroundColor: '#450a0a', borderWidth: 1, borderColor: '#ef4444' },
  btnText: { fontSize: 15, fontWeight: '700', color: '#f8fafc' },
  submitted: { fontSize: 14, color: '#22c55e', fontWeight: '600' },
});

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 20, paddingBottom: 48, gap: 12 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  title: { fontSize: 28, fontWeight: '900', color: '#f8fafc', letterSpacing: -0.5 },
  proBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1c1000', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#f59e0b' },
  proBtnText: { fontSize: 13, fontWeight: '700', color: '#f59e0b' },

  // Usage limit banners
  limitBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1c1000', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f59e0b',
  },
  limitBannerTitle: { fontSize: 14, fontWeight: '700', color: '#f59e0b' },
  limitBannerSub: { fontSize: 12, color: '#92400e', marginTop: 1 },
  warningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1c1000', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  warningBannerText: { fontSize: 13, color: '#d97706', fontWeight: '500' },
  scanButtonLocked: { backgroundColor: '#334155', shadowOpacity: 0 },

  // Primary scan button
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  scanButtonIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  scanButtonText: { flex: 1 },
  scanButtonTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  scanButtonSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 },

  // OR divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1e293b' },
  dividerText: { fontSize: 12, color: '#334155', fontWeight: '500' },

  // Platform grid
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  platformButton: {
    flexDirection: 'row', alignItems: 'center',
    flex: 1, minWidth: '45%',
    backgroundColor: '#1e293b', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12,
    borderWidth: 1, gap: 8,
  },
  platformDot: { width: 8, height: 8, borderRadius: 4 },
  platformLabel: { flex: 1, fontSize: 13, fontWeight: '700' },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#450a0a', borderRadius: 10, padding: 12 },
  errorBannerText: { color: '#f87171', fontSize: 14, flex: 1 },

  // Recent analyses
  recentSection: { gap: 8 },
  recentTitle: { fontSize: 12, fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: 0.8 },
  recentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, padding: 12, gap: 10 },
  recentBadge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recentInfo: { flex: 1 },
  recentRec: { fontSize: 13, fontWeight: '700' },
  recentMeta: { fontSize: 11, color: '#475569', marginTop: 1 },
  recentRate: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },

  // Loading
  loadingCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 48, alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  loadingHint: { fontSize: 13, color: '#64748b' },

  // Result
  resultHeader: { alignItems: 'center', gap: 10, marginBottom: 28, marginTop: 8 },
  recommendationLabel: { fontSize: 44, fontWeight: '900', letterSpacing: 2 },
  hourlyRate: { fontSize: 28, fontWeight: '800' },
  detailsCard: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, marginBottom: 12 },
  detailsTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  detailLabel: { fontSize: 15, color: '#94a3b8' },
  detailValue: { fontSize: 15, color: '#f8fafc', fontWeight: '600' },
  reasoningCard: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, marginBottom: 12, gap: 10 },
  reasoningItem: { fontSize: 14, color: '#cbd5e1', lineHeight: 22 },
  meta: { fontSize: 12, color: '#475569', textAlign: 'center', marginVertical: 12 },
  analyzeAnotherButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, marginTop: 4 },
  analyzeAnotherText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
});
