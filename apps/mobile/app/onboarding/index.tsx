import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { capture } from '@/lib/analytics';
import { captureError } from '@/lib/sentry';
import { useAuth } from '@/context/AuthContext';
import type { UserPlatformPreference } from '@drivercopilot/types';

type Step = 1 | 2 | 3;

const PLATFORM_OPTIONS: { key: UserPlatformPreference; label: string; color: string }[] = [
  { key: 'uber_eats', label: 'Uber Eats', color: '#16a34a' },
  { key: 'doordash', label: 'DoorDash', color: '#dc2626' },
  { key: 'grubhub', label: 'Grubhub', color: '#ea580c' },
  { key: 'instacart', label: 'Instacart', color: '#22c55e' },
];

const CITIES = [
  'Los Angeles', 'New York', 'Chicago', 'Houston', 'Phoenix',
  'San Francisco', 'Miami', 'Seattle', 'Austin', 'Denver',
  'Atlanta', 'Boston', 'Dallas', 'San Diego', 'Portland',
];

export default function OnboardingScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [platforms, setPlatforms] = useState<UserPlatformPreference[]>([]);
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);

  const togglePlatform = useCallback((p: UserPlatformPreference) => {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p],
    );
  }, []);

  const goNext = useCallback(() => setStep(s => Math.min(s + 1, 3) as Step), []);
  const goBack = useCallback(() => setStep(s => Math.max(s - 1, 1) as Step), []);

  const finish = useCallback(async (notificationsGranted: boolean) => {
    // Guard: if user is null, the auth state was lost — send back to auth
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('user_profiles').upsert(
        {
          id: user.id,
          email: user.email ?? '',
          platforms: platforms.length > 0 ? platforms : ['uber_eats'],
          primary_city: city || 'Unknown',
          is_pro: false,
          onboarding_completed_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (error) throw error;

      capture('onboarding_completed', {
        platforms_count: platforms.length,
        city: city || 'Unknown',
        notifications_enabled: notificationsGranted,
      });

      router.replace('/(tabs)');
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        source: 'onboarding.finish',
      });
      Alert.alert('Error', 'Could not save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user, platforms, city]);

  const handleStep3 = useCallback(async (requestNotifs: boolean) => {
    let granted = false;
    if (requestNotifs) {
      const { status } = await Notifications.requestPermissionsAsync();
      granted = status === 'granted';
    }
    // Call finish AFTER waiting for OS permission result
    await finish(granted);
  }, [finish]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressRow}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Go back to previous step"
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.dotsContainer}>
          {([1, 2, 3] as Step[]).map(n => (
            <View
              key={n}
              style={[styles.dot, step >= n && styles.dotActive]}
              accessibilityLabel={`Step ${n} of 3${step === n ? ', current' : step > n ? ', completed' : ''}`}
            />
          ))}
        </View>
        {/* Spacer to keep dots centered when back button is visible */}
        {step > 1 && <View style={styles.backBtnSpacer} />}
      </View>

      {step === 1 && (
        <StepPlatforms selected={platforms} onToggle={togglePlatform} onNext={goNext} />
      )}
      {step === 2 && (
        <StepCity selected={city} onSelect={setCity} onNext={goNext} />
      )}
      {step === 3 && (
        <StepNotifications onFinish={handleStep3} saving={saving} />
      )}
    </SafeAreaView>
  );
}

// ── Step 1: Platforms ──────────────────────────────────────────

function StepPlatforms({
  selected, onToggle, onNext,
}: {
  selected: UserPlatformPreference[];
  onToggle: (p: UserPlatformPreference) => void;
  onNext: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.step}>
      <Text style={styles.stepLabel}>STEP 1 OF 3</Text>
      <Text style={styles.stepTitle}>Which apps do you drive for?</Text>
      <Text style={styles.stepSub}>Select all that apply.</Text>

      <View style={styles.optionsGap}>
        {PLATFORM_OPTIONS.map(({ key, label, color }) => {
          const active = selected.includes(key);
          return (
            <TouchableOpacity
              key={key}
              style={[styles.optionCard, active && { borderColor: color, backgroundColor: '#0f2040' }]}
              onPress={() => onToggle(key)}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityLabel={label}
              accessibilityState={{ checked: active }}
            >
              <View style={[styles.platformDot, { backgroundColor: color }]} />
              <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                {label}
              </Text>
              <View style={[styles.checkbox, active && { backgroundColor: color, borderColor: color }]}>
                {active && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel={selected.length === 0 ? 'Skip platform selection' : 'Continue to city selection'}
      >
        <Text style={styles.primaryButtonText}>
          {selected.length === 0 ? 'Skip' : `Continue (${selected.length} selected)`}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Step 2: City ───────────────────────────────────────────────

function StepCity({
  selected, onSelect, onNext,
}: {
  selected: string;
  onSelect: (c: string) => void;
  onNext: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.step}>
      <Text style={styles.stepLabel}>STEP 2 OF 3</Text>
      <Text style={styles.stepTitle}>Where do you mainly drive?</Text>
      <Text style={styles.stepSub}>We&apos;ll show you the best zones for your city.</Text>

      <View style={styles.cityGrid}>
        {CITIES.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.cityChip, selected === c && styles.cityChipActive]}
            onPress={() => onSelect(c)}
            accessibilityRole="radio"
            accessibilityLabel={c}
            accessibilityState={{ selected: selected === c }}
          >
            <Text style={[styles.cityChipText, selected === c && styles.cityChipTextActive]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel={selected ? 'Continue to notifications' : 'Skip city selection'}
      >
        <Text style={styles.primaryButtonText}>
          {selected ? 'Continue' : 'Skip'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Step 3: Notifications ──────────────────────────────────────

function StepNotifications({
  onFinish, saving,
}: {
  onFinish: (enable: boolean) => void;
  saving: boolean;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepLabel}>STEP 3 OF 3</Text>
      <Text style={styles.stepTitle}>Get your weekly insights</Text>
      <Text style={styles.stepSub}>
        Driver Copilot analyzes your delivery patterns every week and sends you one actionable tip to earn more.
      </Text>

      <View style={styles.notifBenefits}>
        {[
          { emoji: '📍', text: 'Best zones for your shift' },
          { emoji: '⏱', text: 'Optimal working hours' },
          { emoji: '💡', text: 'Offer quality trends' },
        ].map(({ emoji, text }) => (
          <View key={text} style={styles.benefitRow}>
            <Text style={styles.benefitEmoji}>{emoji}</Text>
            <Text style={styles.notifBenefit}>{text}</Text>
          </View>
        ))}
      </View>

      {saving ? (
        <View style={styles.savingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.savingText}>Saving your preferences…</Text>
        </View>
      ) : (
        <View style={styles.notifButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => onFinish(true)}
            accessibilityRole="button"
            accessibilityLabel="Enable notifications"
          >
            <Text style={styles.primaryButtonText}>Enable Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghostButton}
            onPress={() => onFinish(false)}
            accessibilityRole="button"
            accessibilityLabel="Skip notifications, maybe later"
          >
            <Text style={styles.ghostButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: { paddingRight: 12 },
  backBtnText: { color: '#60a5fa', fontSize: 15 },
  backBtnSpacer: { width: 60 },
  dotsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1e293b' },
  dotActive: { backgroundColor: '#3b82f6', width: 24 },

  step: { padding: 28, paddingTop: 32, paddingBottom: 48 },
  stepLabel: {
    fontSize: 11, fontWeight: '700', color: '#3b82f6',
    letterSpacing: 1.2, marginBottom: 12,
  },
  stepTitle: { fontSize: 26, fontWeight: '800', color: '#f8fafc', marginBottom: 8 },
  stepSub: { fontSize: 15, color: '#94a3b8', marginBottom: 32, lineHeight: 22 },

  optionsGap: { gap: 12, marginBottom: 32 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b',
    borderRadius: 14, padding: 20, borderWidth: 1.5, borderColor: '#334155', gap: 12,
  },
  platformDot: { width: 12, height: 12, borderRadius: 6 },
  optionLabel: { flex: 1, fontSize: 17, fontWeight: '600', color: '#94a3b8' },
  optionLabelActive: { color: '#f8fafc' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 1.5,
    borderColor: '#475569', alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },

  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  cityChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155',
  },
  cityChipActive: { backgroundColor: '#172554', borderColor: '#3b82f6' },
  cityChipText: { fontSize: 14, color: '#94a3b8' },
  cityChipTextActive: { color: '#f8fafc', fontWeight: '600' },

  notifBenefits: { gap: 16, marginBottom: 40, marginTop: 8 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitEmoji: { fontSize: 20, width: 28 },
  notifBenefit: { fontSize: 16, color: '#cbd5e1', lineHeight: 22, flex: 1 },

  savingContainer: { alignItems: 'center', gap: 16, marginTop: 32 },
  savingText: { color: '#94a3b8', fontSize: 15 },

  notifButtons: { gap: 12 },
  primaryButton: {
    backgroundColor: '#3b82f6', borderRadius: 14, padding: 18,
    alignItems: 'center', marginTop: 4,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ghostButton: { borderRadius: 14, padding: 16, alignItems: 'center' },
  ghostButtonText: { color: '#64748b', fontSize: 15 },
});
