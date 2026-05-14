import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { initSentry } from '@/lib/sentry';
import { initPostHog, capture } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

// Initialize crash monitoring and analytics once at app startup
initSentry();
initPostHog();

function RootLayoutNav() {
  const { session, loading, user } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    capture('app_opened', { is_cold_start: true });
  }, []);

  // Check if user has completed onboarding
  useEffect(() => {
    if (!user) {
      setOnboardingDone(null);
      return;
    }
    supabase
      .from('user_profiles')
      .select('onboarding_completed_at')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setOnboardingDone(!!data?.onboarding_completed_at);
      });
  }, [user]);

  if (loading) return null;
  // Wait for onboarding check when logged in
  if (session && onboardingDone === null) return null;

  const showOnboarding = session && onboardingDone === false;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="(auth)" />
        ) : showOnboarding ? (
          <Stack.Screen name="onboarding" />
        ) : (
          <Stack.Screen name="(tabs)" />
        )}
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
