import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOfferCapture } from '@/hooks/useOfferCapture';
import type { OfferDecision } from '@drivercopilot/types';

// ── Platform options (single source of truth) ─────────────────

const PLATFORM_OPTIONS = [
  { key: 'uber_eats',  label: 'Uber Eats', color: '#16a34a' },
  { key: 'doordash',   label: 'DoorDash',  color: '#dc2626' },
  { key: 'grubhub',    label: 'Grubhub',   color: '#ea580c' },
  { key: 'instacart',  label: 'Instacart', color: '#22c55e' },
] as const;

type PlatformKey = (typeof PLATFORM_OPTIONS)[number]['key'];

// ── Status labels shown during loading ────────────────────────

const STATUS_LABELS: Record<string, string> = {
  picking:     'Opening photos…',
  compressing: 'Preparing image…',
  parsing:     'Analyzing offer…',
};

// ── Recommendation display config ─────────────────────────────

const REC_CONFIG = {
  accept:      { label: 'ACCEPT',   color: '#22c55e', bg: '#052e16', icon: 'checkmark-circle'  as const },
  decline:     { label: 'DECLINE',  color: '#ef4444', bg: '#450a0a', icon: 'close-circle'       as const },
  conditional: { label: 'CONSIDER', color: '#f59e0b', bg: '#1c1000', icon: 'help-circle'        as const },
};

// ── Main Screen ───────────────────────────────────────────────

export default function OffersScreen() {
  const { status, result, analyzeOffer, reset } = useOfferCapture();
  // Debounce: prevent double-tap from firing two analyses
  const analyzingRef = useRef(false);

  const handleAnalyze = useCallback(async (platform: PlatformKey) => {
    if (analyzingRef.current) return;
    analyzingRef.current = true;
    try {
      await analyzeOffer(platform);
    } finally {
      analyzingRef.current = false;
    }
  }, [analyzeOffer]);

  const isLoading = ['picking', 'compressing', 'parsing'].includes(status);

  // Result screen
  if (status === 'done' && result?.decision) {
    return (
      <ResultView
        decision={result.decision}
        latencyMs={result.latencyMs}
        onReset={reset}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Driver Copilot</Text>
          <Text style={styles.subtitle}>Screenshot an offer to get a recommendation.</Text>
        </View>

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
            <Text style={styles.sectionLabel}>SELECT PLATFORM</Text>

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
                  <Ionicons name="flash" size={16} color={color} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Error state — shown after a failed parse (status resets to idle after Alert) */}
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
}: {
  decision: OfferDecision;
  latencyMs: number;
  onReset: () => void;
}) {
  const cfg = REC_CONFIG[decision.recommendation];
  const { parsedOffer } = decision;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: cfg.bg }]}
      edges={['top']}
      accessibilityLabel={`Recommendation: ${cfg.label}`}
    >
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
    </SafeAreaView>
  );
}

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
  scroll: { padding: 20, paddingBottom: 48 },

  header: { marginTop: 8, marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#f8fafc' },
  subtitle: { fontSize: 15, color: '#94a3b8', marginTop: 4 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#475569',
    letterSpacing: 1.2, marginBottom: 14, textTransform: 'uppercase',
  },

  platformGrid: { gap: 10, marginBottom: 28 },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#450a0a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: '#f87171', fontSize: 14, flex: 1 },

  howItWorks: {
    fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 20,
  },

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },
  analyzeAnotherText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
});
