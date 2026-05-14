import { useState } from 'react';
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
import { useAuth } from '@/context/AuthContext';

type Platform = 'uber_eats' | 'doordash';
type Step = 1 | 2 | 3;

const CITIES = [
  'Los Angeles', 'New York', 'Chicago', 'Houston', 'Phoenix',
  'San Francisco', 'Miami', 'Seattle', 'Austin', 'Denver',
  'Atlanta', 'Boston', 'Dallas', 'San Diego', 'Portland',
];

export default function OnboardingScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);

  const togglePlatform = (p: Platform) => {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p],
    );
  };

  const goNext = () => setStep(s => Math.min(s + 1, 3) as Step);

  const requestNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  };

  const finish = async (notificationsEnabled: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('user_profiles').upsert({
        id: user.id,
        email: user.email ?? '',
        platforms: platforms.length > 0 ? platforms : ['uber_eats', 'doordash'],
        primary_city: city || 'Unknown',
        is_pro: false,
        onboarding_completed_at: new Date().toISOString(),
      });

      if (error) throw error;

      capture('onboarding_completed', {
        platforms,
        city: city || 'Unknown',
        notifications_enabled: notificationsEnabled,
      });

      router.replace('/(tabs)');
    } catch {
      Alert.alert('Error', 'Could not save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleStep3 = async (enableNotifs: boolean) => {
    if (enableNotifs) {
      await requestNotifications();
    }
    await finish(enableNotifs);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress dots */}
      <View style={styles.progress}>
        {[1, 2, 3].map(n => (
          <View key={n} style={[styles.dot, step >= n && styles.dotActive]} />
        ))}
      </View>

      {step === 1 && (
        <StepPlatforms
          selected={platforms}
          onToggle={togglePlatform}
          onNext={goNext}
        />
      )}
      {step === 2 && (
        <StepCity
          selected={city}
          onSelect={setCity}
          onNext={goNext}
        />
      )}
      {step === 3 && (
        <StepNotifications onFinish={handleStep3} saving={saving} />
      )}
    </SafeAreaView>
  );
}

// ── Step 1: Platforms ─────────────────────────────────────────

function StepPlatforms({
  selected,
  onToggle,
  onNext,
}: {
  selected: Platform[];
  onToggle: (p: Platform) => void;
  onNext: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.step}>
      <Text style={styles.stepLabel}>STEP 1 OF 3</Text>
      <Text style={styles.stepTitle}>Which apps do you drive for?</Text>
      <Text style={styles.stepSub}>Select all that apply.</Text>

      <View style={styles.optionsGap}>
        {([
          { key: 'uber_eats' as Platform, label: 'Uber Eats', emoji: '🟢' },
          { key: 'doordash' as Platform, label: 'DoorDash', emoji: '🔴' },
        ] as const).map(({ key, label, emoji }) => {
          const active = selected.includes(key);
          return (
            <TouchableOpacity
              key={key}
              style={[styles.optionCard, active && styles.optionCardActive]}
              onPress={() => onToggle(key)}
              activeOpacity={0.8}
            >
              <Text style={styles.optionEmoji}>{emoji}</Text>
              <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                {label}
              </Text>
              <View style={[styles.checkbox, active && styles.checkboxActive]}>
                {active && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, selected.length === 0 && styles.buttonMuted]}
        onPress={onNext}
      >
        <Text style={styles.primaryButtonText}>
          {selected.length === 0 ? 'Skip' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Step 2: City ──────────────────────────────────────────────

function StepCity({
  selected,
  onSelect,
  onNext,
}: {
  selected: string;
  onSelect: (c: string) => void;
  onNext: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.step}>
      <Text style={styles.stepLabel}>STEP 2 OF 3</Text>
      <Text style={styles.stepTitle}>Where do you mainly drive?</Text>
      <Text style={styles.stepSub}>We'll show you the best zones for your city.</Text>

      <View style={styles.cityGrid}>
        {CITIES.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.cityChip, selected === c && styles.cityChipActive]}
            onPress={() => onSelect(c)}
          >
            <Text style={[styles.cityChipText, selected === c && styles.cityChipTextActive]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={onNext}>
        <Text style={styles.primaryButtonText}>
          {selected ? 'Continue' : 'Skip'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Step 3: Notifications ─────────────────────────────────────

function StepNotifications({
  onFinish,
  saving,
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
          '📍 Best zones for your shift',
          '⏱ Optimal working hours',
          '💡 Offer quality trends',
        ].map(b => (
          <Text key={b} style={styles.notifBenefit}>{b}</Text>
        ))}
      </View>

      {saving ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 32 }} />
      ) : (
        <View style={styles.notifButtons}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => onFinish(true)}>
            <Text style={styles.primaryButtonText}>Enable Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostButton} onPress={() => onFinish(false)}>
            <Text style={styles.ghostButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  progress: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingTop: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1e293b' },
  dotActive: { backgroundColor: '#3b82f6', width: 24 },
  step: { padding: 28, paddingTop: 40, paddingBottom: 48, gap: 0 },
  stepLabel: { fontSize: 11, fontWeight: '700', color: '#3b82f6', letterSpacing: 1.2, marginBottom: 12 },
  stepTitle: { fontSize: 26, fontWeight: '800', color: '#f8fafc', marginBottom: 8 },
  stepSub: { fontSize: 15, color: '#94a3b8', marginBottom: 32, lineHeight: 22 },
  optionsGap: { gap: 12, marginBottom: 32 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b',
    borderRadius: 14, padding: 20, borderWidth: 1.5, borderColor: '#334155', gap: 12,
  },
  optionCardActive: { borderColor: '#3b82f6', backgroundColor: '#172554' },
  optionEmoji: { fontSize: 24 },
  optionLabel: { flex: 1, fontSize: 17, fontWeight: '600', color: '#94a3b8' },
  optionLabelActive: { color: '#f8fafc' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 1.5,
    borderColor: '#475569', alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
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
  notifBenefit: { fontSize: 16, color: '#cbd5e1', lineHeight: 22 },
  notifButtons: { gap: 12 },
  primaryButton: {
    backgroundColor: '#3b82f6', borderRadius: 14, padding: 18,
    alignItems: 'center', marginTop: 4,
  },
  buttonMuted: { backgroundColor: '#1e293b' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ghostButton: {
    borderRadius: 14, padding: 16, alignItems: 'center',
  },
  ghostButtonText: { color: '#64748b', fontSize: 15 },
});
