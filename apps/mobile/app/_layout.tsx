import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { initSentry } from '@/lib/sentry';
import { initPostHog, capture } from '@/lib/analytics';

// Initialize crash monitoring and analytics once at app startup
initSentry();
initPostHog();

function RootLayoutNav() {
  const { session, loading } = useAuth();

  useEffect(() => {
    capture('app_opened', { is_cold_start: true });
  }, []);

  if (loading) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="(auth)" />
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
