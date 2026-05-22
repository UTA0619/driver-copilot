/**
 * SubscriptionContext — provides Pro subscription state app-wide.
 * Wrap the root layout with <SubscriptionProvider> after AuthProvider.
 */
import React, { createContext, useContext } from 'react';
import { useSubscription, SubscriptionState } from '@/hooks/useSubscription';

const SubscriptionContext = createContext<SubscriptionState>({
  isPro: false,
  loading: true,
  refresh: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const subscription = useSubscription();
  return (
    <SubscriptionContext.Provider value={subscription}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext(): SubscriptionState {
  return useContext(SubscriptionContext);
}
