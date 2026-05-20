import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useOfferCapture } from '@/hooks/useOfferCapture';
import { useGamification } from '@/hooks/useGamification';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { capture } from '@/lib/analytics';
import { hapticSuccess, hapticLight, hapticForRecommendation } from '@/lib/haptics';
import { checkDeliveryAchievements, unlockAchievement } from '@/services/gamificationService';
import { GoalProgressBar } from '@/components/GoalProgressBar';
import { StreakDisplay } from '@/components/StreakDisplay';
import { AchievementToast } from '@/components/AchievementToast';
import type { OfferDecision, Achievement } from '@drivercopilot/types';

// ── Platform options ──────────────────────────────────────────

const PLATFORM_OPTIONS = [
  { key: 'uber_eats',  label: 'Uber Eats', color: '#16a34a' },
  { key: 'doordash',   label: 'DoorDash',  color: '#dc2626' },
  { key: 'grubhub',    label: 'Grubhub',   color: '#ea580c' },
  { key: 'instacart',  label: 'Instacart', color: '#22c55e' },
] as const;

type PlatformKey = (typeof PLATFORM_OPTIONS)[number]['key'];

const STATUS_LABELS: Record<string, string> = {
  picking:     'Opening photos…',
  compressing: 'Preparing image…',
  parsing:     'Analyzing offer…',
};

const REC_CONFIG = {
  accept:      { label: 'ACCEPT',   color: '#22c55e', bg: '#052e16', icon: 'checkmark-circle'  as const },
  decline:     { label: 'DECLINE',  color: '#ef4444', bg: '#450a0a', icon: 'close-circle'       as const },
  conditional: { label: 'CONSIDER', color: '#f59e0b', bg: '#1c1000', icon: 'help-circle'        as const },
};

// ── Main Screen ───────────────────────────────────────────────

export default function OffersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { status, result, analyzeOffer, reset } = useOfferCapture();
  const { goal, streak, todayEarnings, todayDeliveries, loading: gamificationLoading, refresh: refreshGamification } = useGamification();
  const analyzingRef = useRef(false);
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null);

  const handleAnalyze = useCallback(async (platform: PlatformKey) => {
    if (analyzingRef.current) return;
    analyzingRef.current = true;
    hapticLight();
    try {
      await analyzeOffer(platform);
      // Unlock first_analysis achievement on first offer
      if (user) {
        const a = await unlockAchievement(user.id, 'first_analysis');
        if (a) setPendingAchievement(a);
      }
    } finally {
      analyzingRef.current = false;
    }
  }, [analyzeOffer, user]);

  // Fire haptic when result arrives
  useEffect(() => {
    if (status === 'done' && result?.decision) {
      hapticForRecommendation(result.decision.recommendation);
    }
  }, [status, result]);

  const isLoading = ['picking', 'compressing', 'parsing'].includes(status);

  // Result screen
  if (status === 'done' && result?.decision) {
    return (
      <>
        <ResultView
          decision={result.decision}
          latencyMs={result.latencyMs}
          onReset={() => { reset(); refreshGamification(); }}
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
            <Text style={styles.title}>Driver Copilot</Text>
            <Text style={styles.subtitle}>
              {streak.currentStreak > 0 ? `🔥 ${streak.currentStreak}-day streak!` : 'Start your first streak today'}
            </Text>
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

        {/* Goal progress — THE main engagement hook */}
        {!gamificationLoading && (
          <GoalProgressBar
            current={todayEarnings}
            target={goal.dailyTarget}
            deliveries={todayDeliveries}
          />
        )}

        {/* Streak & level */}
        {!gamificationLoading && (
          <StreakDisplay streak={streak} />
        )}

        {isLoading ? (
          <View
            style={styles.loadingCard}
            accessibilityLiveRegion="polite"
            accessibilityLabel={STATUS_LABELS[status] ?? 'Analyzing…'}
          >
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>{STATUS_LABELS[status] ?? 'Working…'}</Text>
            <Text style={styles.loadingHint}>This usually takes 2–3 seconds</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>ANALYZE AN OFFER</Text>

            <View style={styles.platformGrid}>
              {PLATFORM_OPTIONS.map(({ key, label, color }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.platformButton, { borderColor: color }]}
                  onPress={() => handleAnalyze(key)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Analyze ${label} offer`}
                  accessibilityHint="Opens your photo library to select a screenshot"
                >
                  <View style={[styles.platformColorDot, { backgroundColor: color }]} />
                  <Text style={[styles.platformButtonText, { color }]}>{label}</Text>
                  <Ionicons name="camera-outline" size={16} color={color} />
                </TouchableOpacity>
              ))}
            </View>

            {status === 'error' && (
              <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
                <Ionicons name="alert-circle-outline" size={18} color="#f87171" />
                <Text style={styles.errorBannerText}>Analysis failed. Please try again.</Text>
              </View>
            )}

            <Text style={styles.howItWorks}>
              Screenshot your offer → tap your platform → get a recommendation in seconds.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Result Card ───────────────────────────────────────────────

function ResultView({
  decision,
  latencyMs,
  onReset,
  userId,
  onAchievement,
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: cfg.bg }]}
      edges={['top']}
      accessibilityLabel={`Recommendation: ${cfg.label}`}
    >
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Big recommendation header */}
          <View style={styles.resultHeader}>
            <Ionicons name={cfg.icon} size={60} color={cfg.color} />
            <Text
              style={[styles.recommendationLabel, { color: cfg.color }]}
              accessibilityRole="header"
            >
              {cfg.label}
            </Text>
            <Text style={[styles.hourlyRate, { color: cfg.color }]}>
              ${decision.effectiveHourlyRate.toFixed(2)}/hr
            </Text>
          </View>

          {/* Offer detail grid */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Offer Details</Text>
            <DetailRow label="Payout" value={`$${parsedOffer.payout.toFixed(2)}`} />
            <DetailRow label="Distance" value={`${parsedOffer.distanceMiles.toFixed(1)} mi`} />
            <DetailRow label="Est. time" value={`${parsedOffer.estimatedMinutes} min`} />
            {parsedOffer.storeName ? (
              <DetailRow label="From" value={parsedOffer.storeName} last />
            ) : (
              <DetailRow label="Platform" value={parsedOffer.platform.replace('_', ' ')} last />
            )}
          </View>

          {/* Reasoning bullets */}
          <View style={styles.reasoningCard}>
            <Text style={styles.detailsTitle}>Why</Text>
            {decision.reasoning.map((reason) => (
              <Text key={reason} style={styles.reasoningItem}>
                • {reason}
              </Text>
            ))}
          </View>

          {/* Offer feedback */}
          <OfferFeedback
            decision={decision}
            userId={userId}
            onAchievement={onAchievement}
          />

          {/* Confidence + parse time */}
          <Text style={styles.meta}>
            Confidence: {decision.confidence} · Analyzed in {(latencyMs / 1000).toFixed(1)}s
          </Text>

          {/* Analyze another */}
          <TouchableOpacity
            style={styles.analyzeAnotherButton}
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel="Analyze another offer"
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

function OfferFeedback({
  decision,
  userId,
  onAchievement,
}: {
  decision: OfferDecision;
  userId: string;
  onAchievement: (a: Achievement) => void;
}) {
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
        // Check for first_accept achievement
        const a = await unlockAchievement(userId, 'first_accept');
        if (a) onAchievement(a);
        // Check rate_chaser
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
        <TouchableOpacity
          style={[feedbackStyles.btn, feedbackStyles.btnYes]}
          onPress={() => handleFeedback(true)}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Yes, I took this offer"
        >
          <Text style={feedbackStyles.btnText}>✓ Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[feedbackStyles.btn, feedbackStyles.btnNo]}
          onPress={() => handleFeedback(false)}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="No, I skipped this offer"
        >
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
  btn: { flex: 1, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' },
  btnYes: { backgroundColor: '#052e16', borderWidth: 1, borderColor: '#22c55e' },
  btnNo: { backgroundColor: '#450a0a', borderWidth: 1, borderColor: '#ef4444' },
  btnText: { fontSize: 15, fontWeight: '700', color: '#f8fafc' },
  submitted: { fontSize: 14, color: '#22c55e', fontWeight: '600' },
});

// ── Detail row sub-component ──────────────────────────────────

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

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#f8fafc' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  proBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1c1000', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#f59e0b' },
  proBtnText: { fontSize: 13, fontWeight: '700', color: '#f59e0b' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#475569',
    letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4,
  },

  platformGrid: { gap: 10 },
  platformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1.5,
    gap: 10,
  },
  platformColorDot: { width: 10, height: 10, borderRadius: 5 },
  platformButtonText: { flex: 1, fontSize: 16, fontWeight: '700' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#450a0a', borderRadius: 10, padding: 12,
  },
  errorBannerText: { color: '#f87171', fontSize: 14, flex: 1 },

  howItWorks: { fontSize: 13, color: '#334155', textAlign: 'center', lineHeight: 20 },

  loadingCard: {
    backgroundColor: '#1e293b', borderRadius: 20, padding: 48,
    alignItems: 'center', gap: 16,
  },
  loadingText: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  loadingHint: { fontSize: 13, color: '#64748b' },

  // Result
  resultHeader: { alignItems: 'center', gap: 10, marginBottom: 28, marginTop: 8 },
  recommendationLabel: { fontSize: 44, fontWeight: '900', letterSpacing: 2 },
  hourlyRate: { fontSize: 28, fontWeight: '800' },

  detailsCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16, padding: 20, marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 11, fontWeight: '700', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  detailLabel: { fontSize: 15, color: '#94a3b8' },
  detailValue: { fontSize: 15, color: '#f8fafc', fontWeight: '600' },

  reasoningCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16, padding: 20, marginBottom: 12, gap: 10,
  },
  reasoningItem: { fontSize: 14, color: '#cbd5e1', lineHeight: 22 },

  meta: { fontSize: 12, color: '#475569', textAlign: 'center', marginVertical: 12 },

  analyzeAnotherButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 16, marginTop: 4,
  },
  analyzeAnotherText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
});
