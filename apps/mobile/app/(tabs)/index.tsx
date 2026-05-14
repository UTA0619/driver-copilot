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
import { capture } from '@/lib/analytics';

const PLATFORM_OPTIONS = [
  { key: 'uber_eats' as const, label: 'Uber Eats', color: '#16a34a' },
  { key: 'doordash' as const, label: 'DoorDash', color: '#dc2626' },
];

const STATUS_LABELS: Record<string, string> = {
  picking: 'Opening photos...',
  compressing: 'Preparing image...',
  parsing: 'Analyzing offer...',
};

export default function OffersScreen() {
  const { status, result, analyzeOffer, reset } = useOfferCapture();

  const isLoading = ['picking', 'compressing', 'parsing'].includes(status);

  if (status === 'done' && result?.decision) {
    return <ResultView decision={result.decision} latencyMs={result.latencyMs} onReset={reset} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Driver Copilot</Text>
          <Text style={styles.subtitle}>Is this offer worth taking?</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>{STATUS_LABELS[status] ?? 'Working...'}</Text>
            <Text style={styles.loadingHint}>This usually takes 2–3 seconds</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>SELECT PLATFORM</Text>
            <View style={styles.platformRow}>
              {PLATFORM_OPTIONS.map(({ key, label, color }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.platformButton, { borderColor: color }]}
                  onPress={() => analyzeOffer(key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.platformButtonText, { color }]}>{label}</Text>
                  <Ionicons name="flash" size={18} color={color} />
                </TouchableOpacity>
              ))}
            </View>

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

import type { OfferDecision } from '@drivercopilot/types';

const RECOMMENDATION_CONFIG = {
  accept: { label: 'ACCEPT', color: '#16a34a', bg: '#052e16', icon: 'checkmark-circle' as const },
  decline: { label: 'DECLINE', color: '#dc2626', bg: '#450a0a', icon: 'close-circle' as const },
  conditional: { label: 'CONSIDER', color: '#d97706', bg: '#1c1000', icon: 'help-circle' as const },
};

function ResultView({
  decision,
  latencyMs,
  onReset,
}: {
  decision: OfferDecision;
  latencyMs: number;
  onReset: () => void;
}) {
  const cfg = RECOMMENDATION_CONFIG[decision.recommendation];
  const { parsedOffer } = decision;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cfg.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Big recommendation header */}
        <View style={styles.resultHeader}>
          <Ionicons name={cfg.icon} size={56} color={cfg.color} />
          <Text style={[styles.recommendationLabel, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={[styles.hourlyRate, { color: cfg.color }]}>
            ${decision.effectiveHourlyRate.toFixed(2)}/hr
          </Text>
        </View>

        {/* Offer details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Offer Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payout</Text>
            <Text style={styles.detailValue}>${parsedOffer.payout.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Distance</Text>
            <Text style={styles.detailValue}>{parsedOffer.distanceMiles} mi</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Est. time</Text>
            <Text style={styles.detailValue}>{parsedOffer.estimatedMinutes} min</Text>
          </View>
          {parsedOffer.storeName && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>From</Text>
              <Text style={styles.detailValue}>{parsedOffer.storeName}</Text>
            </View>
          )}
        </View>

        {/* Reasoning */}
        <View style={styles.reasoningCard}>
          <Text style={styles.detailsTitle}>Why</Text>
          {decision.reasoning.map((r, i) => (
            <Text key={i} style={styles.reasoningItem}>• {r}</Text>
          ))}
        </View>

        {/* Confidence + latency */}
        <Text style={styles.meta}>
          Confidence: {decision.confidence} · Analyzed in {(latencyMs / 1000).toFixed(1)}s
        </Text>

        <TouchableOpacity style={styles.analyzeAnotherButton} onPress={onReset}>
          <Text style={styles.analyzeAnotherText}>Analyze Another Offer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 24, paddingBottom: 48 },
  header: { marginTop: 8, marginBottom: 36 },
  title: { fontSize: 28, fontWeight: '800', color: '#f8fafc' },
  subtitle: { fontSize: 16, color: '#94a3b8', marginTop: 4 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#475569',
    letterSpacing: 1, marginBottom: 12,
  },
  platformRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  platformButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1e293b', borderRadius: 14, padding: 18,
    borderWidth: 1.5, gap: 8,
  },
  platformButtonText: { fontSize: 16, fontWeight: '700' },
  howItWorks: { fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 20 },
  loadingCard: {
    backgroundColor: '#1e293b', borderRadius: 20, padding: 48,
    alignItems: 'center', gap: 16,
  },
  loadingText: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  loadingHint: { fontSize: 13, color: '#64748b' },
  // Result
  resultHeader: { alignItems: 'center', gap: 8, marginBottom: 32, marginTop: 16 },
  recommendationLabel: { fontSize: 42, fontWeight: '900', letterSpacing: 2 },
  hourlyRate: { fontSize: 28, fontWeight: '800' },
  detailsCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
    padding: 20, marginBottom: 12,
  },
  detailsTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  detailLabel: { fontSize: 15, color: '#94a3b8' },
  detailValue: { fontSize: 15, color: '#f8fafc', fontWeight: '600' },
  reasoningCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
    padding: 20, marginBottom: 12, gap: 10,
  },
  reasoningItem: { fontSize: 14, color: '#cbd5e1', lineHeight: 20 },
  meta: { fontSize: 12, color: '#475569', textAlign: 'center', marginVertical: 12 },
  analyzeAnotherButton: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  analyzeAnotherText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
});
