import React, { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingScreen } from '@/components/LoadingScreen';
import { initSentry } from '@/lib/sentry';
import { initPostHog, capture } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

// Initialize crash monitoring and analytics synchronously at startup.
// Both are no-ops in development if keys are not set.
try { initSentry(); } catch { /* never crash the app over analytics init */ }
try { initPostHog(); } catch { /* never crash the app over analytics init */ }

// ─── Root Nav ─────────────────────────────────────────────────

function RootLayoutNav() {
  const { session, loading, user } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [profileError, setProfileError] = useState(false);
  const hasCapturedOpen = useRef(false);

  // Capture app_opened once per JS bundle lifecycle
  useEffect(() => {
    if (!hasCapturedOpen.current) {
      hasCapturedOpen.current = true;
      capture('app_opened', {});
    }
  }, []);

  // Fetch onboarding status when user changes
  useEffect(() => {
    if (!user) {
      setOnboardingDone(null);
      setProfileError(false);
      return;
    }

    let cancelled = false;

    supabase
      .from('user_profiles')
      .select('onboarding_completed_at')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          // Profile may not exist yet (e.g. upsert race after Apple sign-in)
          // Treat as "onboarding not done" and let the onboarding screen create the row
          if (error.code === 'PGRST116') {
            // PGRST116 = row not found
            setOnboardingDone(false);
          } else {
            console.error('[RootLayout] Profile fetch error:', error.message);
            setProfileError(true);
          }
          return;
        }
        setOnboardingDone(!!data?.onboarding_completed_at);
      });

    return () => { cancelled = true; };
  }, [user]);

  // Show loading screen while auth state resolves
  if (loading) {
    return <LoadingScreen message="Loading…" />;
  }

  // Show loading screen while we check onboarding status (for logged-in users)
  if (session && onboardingDone === null && !profileError) {
    return <LoadingScreen message="Setting up your account…" />;
  }

  // If the profile query errored for a non-404 reason, send to onboarding
  // so the user can re-create their profile row
  const showOnboarding = session && (onboardingDone === false || profileError);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
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

// ─── Root Layout ──────────────────────────────────────────────

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ErrorBoundary>
  );
}
