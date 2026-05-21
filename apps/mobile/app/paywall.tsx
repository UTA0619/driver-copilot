/**
 * Paywall screen — Pro subscription offer
 * Uses a graceful fallback if react-native-purchases (RevenueCat) is not available.
 *
 * Route: /paywall (push from any tab via router.push('/paywall'))
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { capture } from '@/lib/analytics';
import { captureError } from '@/lib/sentry';
import { hapticSuccess, hapticLight } from '@/lib/haptics';

// Try to load RevenueCat — fails gracefully in Expo Go
let Purchases: typeof import('react-native-purchases').default | null = null;
try {
  Purchases = require('react-native-purchases').default;
} catch { /* not linked — Expo Go or missing native module */ }

const PRO_FEATURES = [
  { icon: 'analytics-outline' as const,     text: 'Unlimited offer analyses per day' },
  { icon: 'map-outline' as const,           text: 'Full zone heatmap with live data' },
  { icon: 'trending-up-outline' as const,   text: 'AI-powered weekly coaching insights' },
  { icon: 'notifications-outline' as const, text: 'Push notifications for hot zones' },
  { icon: 'cloud-download-outline' as const, text: 'Offline analysis (coming soon)' },
];

const FREE_FEATURES = [
  { text: '10 offer analyses per month', included: true },
  { text: 'Basic earnings tracking', included: true },
  { text: 'Full zone heatmap', included: false },
  { text: 'Weekly coaching insights', included: false },
  { text: 'Push notifications', included: false },
];

export default function PaywallScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleSubscribe = useCallback(async (productId: string) => {
    hapticLight();
    capture('paywall_subscribe_tapped', { product_id: productId });

    if (!Purchases) {
      Alert.alert(
        'Development Mode',
        'RevenueCat is not available in Expo Go. Build with EAS to test purchases.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages.find((p: { identifier: string }) => p.identifier === productId);
      if (!pkg) {
        Alert.alert('Error', 'Package not found. Please try again.');
        return;
      }
      await Purchases.purchasePackage(pkg);
      hapticSuccess();
      capture('paywall_subscribed', { product_id: productId });
      router.back();
    } catch (err) {
      if ((err as { userCancelled?: boolean }).userCancelled) {
        capture('paywall_cancelled', { product_id: productId });
      } else {
        captureError(err instanceof Error ? err : new Error(String(err)), { source: 'PaywallScreen.subscribe' });
        Alert.alert('Purchase Failed', 'Could not complete purchase. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleRestore = useCallback(async () => {
    if (!Purchases) return;
    setRestoring(true);
    try {
      await Purchases.restorePurchases();
      Alert.alert('Restored!', 'Your purchases have been restored.');
      hapticSuccess();
      capture('paywall_restored', {});
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), { source: 'PaywallScreen.restore' });
      Alert.alert('Error', 'Could not restore purchases.');
    } finally {
      setRestoring(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Close paywall"
      >
        <Ionicons name="close" size={24} color="#64748b" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconBadge}>
            <Ionicons name="flash" size={36} color="#f59e0b" />
          </View>
          <Text style={styles.heroTitle}>Driver Copilot Pro</Text>
          <Text style={styles.heroSubtitle}>
            Earn more with unlimited analyses, heatmaps, and AI coaching
          </Text>
        </View>

        {/* Pro features list */}
        <View style={styles.featuresCard}>
          {PRO_FEATURES.map(f => (
            <View key={f.text} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={18} color="#f59e0b" />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Free vs Pro comparison */}
        <Text style={styles.sectionLabel}>Free vs Pro</Text>
        <View style={styles.comparisonCard}>
          {FREE_FEATURES.map(f => (
            <View key={f.text} style={styles.comparisonRow}>
              <Ionicons
                name={f.included ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={f.included ? '#22c55e' : '#334155'}
              />
              <Text style={[styles.comparisonText, !f.included && styles.comparisonTextOff]}>
                {f.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Pricing buttons */}
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={() => handleSubscribe('dc_pro_monthly')}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Subscribe monthly, $6.99 per month"
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <View style={styles.btnInner}>
              <Text style={styles.primaryBtnText}>Start Pro — $6.99/mo</Text>
              <Text style={styles.primaryBtnSub}>7-day free trial · Cancel anytime</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, loading && styles.btnDisabled]}
          onPress={() => handleSubscribe('dc_pro_annual')}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Subscribe annually, $49.99 per year, save 40%"
        >
          <View style={styles.saveBadge}>
            <Text style={styles.saveBadgeText}>SAVE 40%</Text>
          </View>
          <Text style={styles.secondaryBtnText}>Annual — $49.99/yr</Text>
          <Text style={styles.secondaryBtnSub}>Best value · $4.17/mo</Text>
        </TouchableOpacity>

        {/* Restore link */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={restoring}
          accessibilityRole="button"
        >
          <Text style={styles.restoreBtnText}>
            {restoring ? 'Restoring…' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Billed through the App Store. Cancel any time in Settings. Prices may vary by region.
          Payment will be charged to your Apple ID account at the confirmation of purchase.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  closeBtn: { position: 'absolute', top: 56, right: 20, zIndex: 10, padding: 8, backgroundColor: '#1e293b', borderRadius: 20 },
  scroll: { padding: 20, paddingTop: 48, paddingBottom: 48 },

  hero: { alignItems: 'center', gap: 12, marginBottom: 32, marginTop: 20 },
  iconBadge: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#1c1000', borderWidth: 2, borderColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 30, fontWeight: '900', color: '#f8fafc', letterSpacing: 0.5 },
  heroSubtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', lineHeight: 24 },

  featuresCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, gap: 16, marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1c1000', alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontSize: 15, color: '#f8fafc', fontWeight: '500' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
  comparisonCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, gap: 12, marginBottom: 28, borderWidth: 1, borderColor: '#334155' },
  comparisonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  comparisonText: { fontSize: 14, color: '#94a3b8' },
  comparisonTextOff: { color: '#334155' },

  primaryBtn: { backgroundColor: '#f59e0b', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 12 },
  secondaryBtn: { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 1.5, borderColor: '#f59e0b', marginBottom: 16, gap: 4 },
  btnDisabled: { opacity: 0.5 },
  btnInner: { gap: 4, alignItems: 'center' },
  primaryBtnText: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  primaryBtnSub: { fontSize: 13, color: '#92400e' },
  secondaryBtnText: { fontSize: 17, fontWeight: '700', color: '#f59e0b' },
  secondaryBtnSub: { fontSize: 13, color: '#64748b' },
  saveBadge: { backgroundColor: '#f59e0b', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  saveBadgeText: { fontSize: 11, fontWeight: '800', color: '#0f172a' },

  restoreBtn: { alignItems: 'center', padding: 12 },
  restoreBtnText: { fontSize: 14, color: '#475569' },

  legal: { fontSize: 11, color: '#334155', textAlign: 'center', lineHeight: 18, marginTop: 8 },
});
