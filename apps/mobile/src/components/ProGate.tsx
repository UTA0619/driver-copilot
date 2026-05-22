/**
 * ProGate — renders children for Pro users; shows an upsell wall for free users.
 * Usage:
 *   <ProGate feature="Zone Heatmap">
 *     <HeatmapView />
 *   </ProGate>
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { hapticLight } from '@/lib/haptics';
import { SkeletonCard } from '@/components/SkeletonCard';

interface ProGateProps {
  /** Display name of the gated feature (shown in the upsell card) */
  feature: string;
  /** Icon name from Ionicons outline set */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** One-line benefit description shown below the feature name */
  benefit?: string;
  children: React.ReactNode;
}

export function ProGate({ feature, icon = 'flash-outline', benefit, children }: ProGateProps) {
  const { isPro, loading } = useSubscriptionContext();
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <SkeletonCard height={200} borderRadius={20} />
      </View>
    );
  }

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <View style={styles.gate}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={40} color="#f59e0b" />
      </View>
      <Text style={styles.title}>{feature}</Text>
      <Text style={styles.subtitle}>
        {benefit ?? `Unlock ${feature} with Driver Copilot Pro`}
      </Text>

      <View style={styles.bullets}>
        <BulletRow text="Unlimited offer analyses" />
        <BulletRow text="Full zone heatmap with live data" />
        <BulletRow text="AI-powered weekly coaching" />
        <BulletRow text="Push notifications for hot zones" />
      </View>

      <TouchableOpacity
        style={styles.upgradeBtn}
        onPress={() => { hapticLight(); router.push('/paywall'); }}
        accessibilityRole="button"
        accessibilityLabel="Upgrade to Pro"
      >
        <Ionicons name="flash" size={16} color="#0f172a" />
        <Text style={styles.upgradeBtnText}>Upgrade to Pro — $6.99/mo</Text>
      </TouchableOpacity>

      <Text style={styles.trialNote}>7-day free trial · Cancel anytime</Text>
    </View>
  );
}

function BulletRow({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { padding: 20 },

  gate: {
    margin: 20,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#f59e0b44',
  },

  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#1c1000',
    borderWidth: 2,
    borderColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
  },

  bullets: { width: '100%', gap: 10, marginVertical: 8 },

  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletText: { fontSize: 14, color: '#cbd5e1', flex: 1 },

  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '100%',
    justifyContent: 'center',
    marginTop: 4,
  },
  upgradeBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },

  trialNote: { fontSize: 12, color: '#475569' },
});
