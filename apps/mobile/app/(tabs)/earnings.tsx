import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { capture } from '@/lib/analytics';
import { captureError } from '@/lib/sentry';
import { SkeletonCard, SkeletonRow } from '@/components/SkeletonCard';
import type { Delivery, EarningsPeriod, DeliveryPlatform } from '@drivercopilot/types';

// ── Helpers ────────────────────────────────────────────────────

function fmt$(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtRate(n: number): string {
  return n > 0 ? `$${n.toFixed(2)}/hr` : '—';
}

function periodLabel(p: EarningsPeriod): string {
  return p === 'today' ? 'Today' : p === 'week' ? 'This week' : 'This month';
}

function periodRange(p: EarningsPeriod): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  if (p === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    return { start, end };
  }
  if (p === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { start: d.toISOString(), end };
  }
  const d = new Date(now);
  d.setDate(1);
  return { start: d.toISOString(), end };
}

function calcSummary(deliveries: Delivery[]) {
  const totalEarnings = deliveries.reduce((s, d) => s + d.payout + d.tip, 0);
  const totalTips = deliveries.reduce((s, d) => s + d.tip, 0);
  const totalMinutes = deliveries.reduce((s, d) => s + (d.durationMinutes ?? 0), 0);
  const totalActiveHours = totalMinutes / 60;
  const effectiveHourlyRate = totalActiveHours > 0 ? totalEarnings / totalActiveHours : 0;
  return { totalEarnings, totalTips, deliveryCount: deliveries.length, totalActiveHours, effectiveHourlyRate };
}

const PLATFORMS: { key: DeliveryPlatform; label: string; color: string }[] = [
  { key: 'uber_eats', label: 'Uber Eats', color: '#16a34a' },
  { key: 'doordash',  label: 'DoorDash',  color: '#dc2626' },
  { key: 'grubhub',   label: 'Grubhub',   color: '#ea580c' },
  { key: 'instacart', label: 'Instacart', color: '#22c55e' },
];

// ── Main Screen ────────────────────────────────────────────────

export default function EarningsScreen() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<EarningsPeriod>('week');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { start, end } = periodRange(period);
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('user_id', user.id)
      .gte('started_at', start)
      .lte('started_at', end)
      .order('started_at', { ascending: false });

    if (error) {
      captureError(new Error(error.message), { source: 'EarningsScreen.fetch' });
    } else {
      // Map snake_case DB columns → camelCase TypeScript fields
      setDeliveries(
        (data ?? []).map((d: Record<string, unknown>) => ({
          id: d.id as string,
          userId: d.user_id as string,
          platform: d.platform as DeliveryPlatform,
          payout: Number(d.payout),
          tip: Number(d.tip),
          distanceMiles: Number(d.distance_miles ?? 0),
          durationMinutes: Number(d.duration_minutes ?? 0),
          startedAt: d.started_at as string,
          endedAt: d.ended_at as string,
          zoneH3Index: (d.zone_h3_index as string | null) ?? null,
          acceptedRecommendation: (d.accepted_recommendation as boolean | null) ?? null,
          notes: (d.notes as string | null) ?? null,
          createdAt: d.created_at as string,
        }))
      );
    }
    setLoading(false);
  }, [user, period]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  const summary = useMemo(() => calcSummary(deliveries), [deliveries]);

  const rateColor =
    summary.effectiveHourlyRate >= 18 ? '#22c55e' :
    summary.effectiveHourlyRate >= 12 ? '#f59e0b' : '#f87171';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Earnings</Text>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => setShowLogModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Log a delivery"
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.logBtnText}>Log</Text>
        </TouchableOpacity>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {(['today', 'week', 'month'] as EarningsPeriod[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodChip, period === p && styles.periodChipActive]}
            onPress={() => setPeriod(p)}
            accessibilityRole="button"
            accessibilityLabel={periodLabel(p)}
            accessibilityState={{ selected: period === p }}
          >
            <Text style={[styles.periodChipText, period === p && styles.periodChipTextActive]}>
              {periodLabel(p)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary cards */}
        {loading ? (
          <View style={styles.skeletonSection}>
            <SkeletonRow>
              <SkeletonCard width="47%" height={100} />
              <SkeletonCard width="47%" height={100} />
            </SkeletonRow>
            <SkeletonCard height={90} style={{ marginTop: 12 }} />
          </View>
        ) : (
          <>
            <View style={styles.cards}>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Deliveries</Text>
                <Text style={styles.cardAmount}>{summary.deliveryCount}</Text>
                <Text style={styles.cardSub}>{periodLabel(period)}</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Earned</Text>
                <Text style={styles.cardAmount}>{fmt$(summary.totalEarnings)}</Text>
                <Text style={styles.cardSub}>incl. {fmt$(summary.totalTips)} tips</Text>
              </View>
            </View>

            <View style={[styles.card, styles.rateCard]}>
              <Text style={styles.cardLabel}>Effective hourly rate</Text>
              <Text style={[styles.rateAmount, { color: rateColor }]}>
                {fmtRate(summary.effectiveHourlyRate)}
              </Text>
              <Text style={styles.cardSub}>
                {summary.totalActiveHours > 0
                  ? `${summary.totalActiveHours.toFixed(1)} active hours`
                  : 'Log durations to see your rate'}
              </Text>
            </View>
          </>
        )}

        {/* Delivery list */}
        <Text style={styles.sectionTitle}>Recent Deliveries</Text>

        {loading ? (
          <View style={{ gap: 10 }}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} height={72} borderRadius={12} />)}
          </View>
        ) : deliveries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#334155" />
            <Text style={styles.emptyTitle}>No deliveries yet</Text>
            <Text style={styles.emptyText}>
              Tap <Text style={styles.emptyHighlight}>Log</Text> to record your first delivery.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {deliveries.map(d => <DeliveryRow key={d.id} delivery={d} />)}
          </View>
        )}
      </ScrollView>

      {/* Log delivery modal */}
      <LogDeliveryModal
        visible={showLogModal}
        onClose={() => setShowLogModal(false)}
        onSaved={() => { setShowLogModal(false); fetchDeliveries(); }}
        userId={user?.id ?? ''}
      />
    </SafeAreaView>
  );
}

// ── Delivery Row ───────────────────────────────────────────────

function DeliveryRow({ delivery: d }: { delivery: Delivery }) {
  const platform = PLATFORMS.find(p => p.key === d.platform);
  const total = d.payout + d.tip;
  const date = new Date(d.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.deliveryRow} accessibilityLabel={`${platform?.label ?? d.platform} delivery, $${total.toFixed(2)}`}>
      <View style={[styles.platformBadge, { backgroundColor: (platform?.color ?? '#475569') + '22' }]}>
        <View style={[styles.platformDot, { backgroundColor: platform?.color ?? '#475569' }]} />
      </View>
      <View style={styles.deliveryInfo}>
        <Text style={styles.deliveryPlatform}>{platform?.label ?? d.platform}</Text>
        <Text style={styles.deliveryMeta}>
          {d.distanceMiles > 0 ? `${d.distanceMiles.toFixed(1)} mi` : ''}
          {d.distanceMiles > 0 && d.durationMinutes > 0 ? ' · ' : ''}
          {d.durationMinutes > 0 ? `${d.durationMinutes} min` : ''}
          {(!d.distanceMiles && !d.durationMinutes) ? date : ''}
        </Text>
      </View>
      <Text style={styles.deliveryAmount}>{fmt$(total)}</Text>
    </View>
  );
}

// ── Log Delivery Modal ─────────────────────────────────────────

interface LogModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
}

function LogDeliveryModal({ visible, onClose, onSaved, userId }: LogModalProps) {
  const [platform, setPlatform] = useState<DeliveryPlatform>('uber_eats');
  const [payout, setPayout] = useState('');
  const [tip, setTip] = useState('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const payoutNum = parseFloat(payout);
    if (isNaN(payoutNum) || payoutNum < 0) {
      Alert.alert('Invalid payout', 'Please enter a valid payout amount.');
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from('deliveries').insert({
      user_id: userId,
      platform,
      payout: payoutNum,
      tip: parseFloat(tip) || 0,
      distance_miles: parseFloat(distance) || null,
      duration_minutes: parseInt(duration, 10) || null,
      started_at: now,
      ended_at: now,
    });
    setSaving(false);

    if (error) {
      captureError(new Error(error.message), { source: 'LogDeliveryModal.save' });
      Alert.alert('Error', 'Could not save delivery. Please try again.');
      return;
    }

    capture('delivery_logged', {
      platform,
      payout: payoutNum,
      has_tip: parseFloat(tip) > 0,
    });

    // Reset fields
    setPayout(''); setTip(''); setDistance(''); setDuration('');
    onSaved();
  }, [userId, platform, payout, tip, distance, duration, onSaved]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Log Delivery</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          {/* Platform selector */}
          <Text style={styles.fieldLabel}>Platform</Text>
          <View style={styles.platformRow}>
            {PLATFORMS.map(p => (
              <TouchableOpacity
                key={p.key}
                style={[styles.platformChip, platform === p.key && { borderColor: p.color, backgroundColor: p.color + '22' }]}
                onPress={() => setPlatform(p.key)}
                accessibilityRole="radio"
                accessibilityLabel={p.label}
                accessibilityState={{ selected: platform === p.key }}
              >
                <Text style={[styles.platformChipText, platform === p.key && { color: p.color }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Payout */}
          <Text style={styles.fieldLabel}>Payout (required)</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. 8.50"
            placeholderTextColor="#475569"
            value={payout}
            onChangeText={setPayout}
            keyboardType="decimal-pad"
            accessibilityLabel="Payout amount in dollars"
          />

          {/* Tip */}
          <Text style={styles.fieldLabel}>Tip</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. 2.00 (optional)"
            placeholderTextColor="#475569"
            value={tip}
            onChangeText={setTip}
            keyboardType="decimal-pad"
            accessibilityLabel="Tip amount in dollars"
          />

          {/* Distance */}
          <Text style={styles.fieldLabel}>Distance (miles)</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. 3.2 (optional)"
            placeholderTextColor="#475569"
            value={distance}
            onChangeText={setDistance}
            keyboardType="decimal-pad"
            accessibilityLabel="Delivery distance in miles"
          />

          {/* Duration */}
          <Text style={styles.fieldLabel}>Duration (minutes)</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. 18 (optional)"
            placeholderTextColor="#475569"
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            accessibilityLabel="Delivery duration in minutes"
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save delivery"
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Delivery</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#f8fafc' },
  logBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  logBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  periodChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  periodChipActive: { backgroundColor: '#172554', borderColor: '#3b82f6' },
  periodChipText: { color: '#64748b', fontSize: 14 },
  periodChipTextActive: { color: '#f8fafc', fontWeight: '600' },

  skeletonSection: { gap: 12, marginBottom: 20 },
  cards: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: { flex: 1, backgroundColor: '#1e293b', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#334155' },
  rateCard: { flex: 0, marginBottom: 24 },
  cardLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  cardAmount: { fontSize: 28, fontWeight: '800', color: '#f8fafc' },
  rateAmount: { fontSize: 36, fontWeight: '800' },
  cardSub: { fontSize: 12, color: '#475569', marginTop: 4 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#94a3b8', marginBottom: 12 },

  deliveryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, padding: 14, gap: 12 },
  platformBadge: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  platformDot: { width: 12, height: 12, borderRadius: 6 },
  deliveryInfo: { flex: 1 },
  deliveryPlatform: { fontSize: 15, fontWeight: '600', color: '#f8fafc' },
  deliveryMeta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  deliveryAmount: { fontSize: 17, fontWeight: '700', color: '#22c55e' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#475569' },
  emptyText: { fontSize: 14, color: '#475569', textAlign: 'center' },
  emptyHighlight: { color: '#3b82f6', fontWeight: '600' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#f8fafc' },
  modalBody: { padding: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  fieldInput: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, fontSize: 16, color: '#f8fafc', borderWidth: 1, borderColor: '#334155' },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  platformChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#334155', backgroundColor: '#1e293b' },
  platformChipText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 28, marginBottom: 32 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
