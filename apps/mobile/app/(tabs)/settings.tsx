/**
 * Settings tab — account info, subscription status, links, sign-out.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '@/context/AuthContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { capture } from '@/lib/analytics';

// Lazy-load RevenueCat for restore purchases
let Purchases: typeof import('react-native-purchases').default | null = null;
try { Purchases = require('react-native-purchases').default; } catch { /* Expo Go */ }

const APP_VERSION = Constants.expoConfig?.version ?? '0.1.0';
const WEB_URL = 'https://drivercopilot.com';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isPro, refresh: refreshSub } = useSubscriptionContext();
  const [restoring, setRestoring] = useState(false);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          hapticLight();
          await signOut();
        },
      },
    ]);
  }, [signOut]);

  const handleRestorePurchases = useCallback(async () => {
    if (!Purchases) {
      Alert.alert('Development Mode', 'Purchases not available in Expo Go.');
      return;
    }
    setRestoring(true);
    try {
      await Purchases.restorePurchases();
      await refreshSub();
      hapticSuccess();
      capture('paywall_restored', {});
      Alert.alert('Restored', 'Your purchases have been restored.');
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  }, [refreshSub]);

  const openLink = useCallback((url: string) => {
    hapticLight();
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open link.')
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Account card */}
        <View style={styles.card}>
          <View style={styles.accountRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={22} color="#64748b" />
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountEmail} numberOfLines={1}>
                {user?.email ?? 'Unknown'}
              </Text>
              <View style={styles.planBadge}>
                <Ionicons
                  name={isPro ? 'flash' : 'flash-outline'}
                  size={12}
                  color={isPro ? '#f59e0b' : '#475569'}
                />
                <Text style={[styles.planBadgeText, isPro && styles.planBadgeTextPro]}>
                  {isPro ? 'Pro' : 'Free Plan'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Subscription */}
        <SectionLabel label="Subscription" />
        <View style={styles.card}>
          {!isPro && (
            <SettingsRow
              icon="flash"
              iconColor="#f59e0b"
              label="Upgrade to Pro"
              sublabel="$6.99/mo · 7-day free trial"
              onPress={() => { hapticLight(); router.push('/paywall'); }}
              accent
            />
          )}
          <SettingsRow
            icon="refresh-outline"
            label={restoring ? 'Restoring…' : 'Restore Purchases'}
            onPress={handleRestorePurchases}
            last
          />
        </View>

        {/* Support */}
        <SectionLabel label="Support" />
        <View style={styles.card}>
          <SettingsRow
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => openLink(`${WEB_URL}/privacy`)}
          />
          <SettingsRow
            icon="help-circle-outline"
            label="Help & FAQ"
            onPress={() => openLink(`${WEB_URL}/support`)}
          />
          <SettingsRow
            icon="mail-outline"
            label="Contact Support"
            onPress={() => openLink('mailto:support@drivercopilot.com')}
            last
          />
        </View>

        {/* About */}
        <SectionLabel label="About" />
        <View style={styles.card}>
          <SettingsRow
            icon="globe-outline"
            label="Website"
            sublabel={WEB_URL}
            onPress={() => openLink(WEB_URL)}
          />
          <View style={[styles.row, styles.rowLast]}>
            <Ionicons name="information-circle-outline" size={20} color="#475569" />
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>{APP_VERSION}</Text>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Driver Copilot · Made for gig drivers everywhere
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>;
}

function SettingsRow({
  icon, iconColor = '#475569', label, sublabel, onPress, last, accent,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  last?: boolean;
  accent?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, last && styles.rowLast]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={20} color={accent ? '#f59e0b' : iconColor} />
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, accent && styles.rowLabelAccent]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#334155" />
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingHorizontal: 20, marginTop: 20, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 48, gap: 0 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#475569',
    letterSpacing: 1.2, marginTop: 20, marginBottom: 8, marginLeft: 4,
  },

  card: {
    backgroundColor: '#1e293b', borderRadius: 16,
    borderWidth: 1, borderColor: '#334155', overflow: 'hidden',
  },

  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  accountInfo: { flex: 1, gap: 4 },
  accountEmail: { fontSize: 15, fontWeight: '600', color: '#f8fafc' },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  planBadgeText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  planBadgeTextPro: { color: '#f59e0b' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  rowLast: { borderBottomWidth: 0 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, color: '#f8fafc', fontWeight: '500' },
  rowLabelAccent: { color: '#f59e0b', fontWeight: '700' },
  rowSublabel: { fontSize: 12, color: '#475569', marginTop: 1 },
  rowValue: { fontSize: 14, color: '#475569' },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1e293b', borderRadius: 14,
    padding: 16, marginTop: 24,
    borderWidth: 1, borderColor: '#450a0a',
  },
  signOutText: { fontSize: 16, fontWeight: '700', color: '#ef4444' },

  footer: {
    fontSize: 12, color: '#334155', textAlign: 'center', marginTop: 24,
  },
});
