/**
 * useSubscription — checks RevenueCat entitlements to determine Pro status.
 * Falls back to free tier if react-native-purchases is not linked (Expo Go).
 */
import { useEffect, useState } from 'react';
import type { CustomerInfo } from 'react-native-purchases';

// Lazy-load RevenueCat — safe in Expo Go (no native module)
let Purchases: typeof import('react-native-purchases').default | null = null;
try {
  Purchases = require('react-native-purchases').default;
} catch { /* Expo Go or missing native module */ }

export const PRO_ENTITLEMENT = 'pro';

export interface SubscriptionState {
  isPro: boolean;
  loading: boolean;
  /** Re-check entitlements (call after a purchase or restore) */
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkEntitlement = async () => {
    if (!Purchases) {
      // RevenueCat not available — treat as free in Expo Go / dev
      setIsPro(false);
      setLoading(false);
      return;
    }
    try {
      const info: CustomerInfo = await Purchases.getCustomerInfo();
      const active = info.entitlements.active[PRO_ENTITLEMENT];
      setIsPro(active?.isActive === true);
    } catch {
      // Network error — keep previous state, don't lock the user out
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { checkEntitlement(); }, []);

  return { isPro, loading, refresh: checkEntitlement };
}
