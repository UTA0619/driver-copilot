import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';
import type { AnalyticsEvent } from '@drivercopilot/types';

const posthogKey = Constants.expoConfig?.extra?.posthogKey as string | undefined;
const posthogHost = (Constants.expoConfig?.extra?.posthogHost as string) ?? 'https://app.posthog.com';
const appEnv = (Constants.expoConfig?.extra?.appEnv as string) ?? 'development';
const appVersion = Constants.expoConfig?.version ?? 'unknown';

// Only capture in production. Staging still gets analytics for QA purposes
// but tagged so they can be filtered. Never in development.
const isDisabled = appEnv === 'development';

// Base properties attached to every event for easy filtering in PostHog
const baseProperties = {
  app_env: appEnv,
  app_version: appVersion,
};

let client: PostHog | null = null;

export function initPostHog(): PostHog | null {
  if (!posthogKey) {
    if (__DEV__) {
      console.warn('[PostHog] Key not configured — analytics disabled. Set EXPO_PUBLIC_POSTHOG_KEY.');
    }
    return null;
  }

  client = new PostHog(posthogKey, {
    host: posthogHost,
    disabled: isDisabled,
    // Flush events quickly in staging so they appear promptly in the UI
    flushAt: appEnv === 'production' ? 20 : 1,
    flushInterval: appEnv === 'production' ? 30000 : 5000,
  });

  return client;
}

export function getPostHog(): PostHog | null {
  return client;
}

/**
 * Type-safe event capture. Event names are constrained to AnalyticsEvent union.
 * In development, logs to console instead of sending to PostHog.
 */
export function capture(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
): void {
  const payload = { ...baseProperties, ...properties };

  if (__DEV__) {
    // Log in development so engineers can verify event names without PostHog
    console.log(`[Analytics] ${event}`, payload);
    return;
  }

  client?.capture(event, payload);
}

/**
 * Identify the current user. Only attaches identity after confirmed sign-in.
 * Includes app_env and app_version so user properties are filterable.
 */
export function identify(
  userId: string,
  userProperties?: Record<string, unknown>,
): void {
  if (__DEV__) {
    console.log('[Analytics] identify', userId, userProperties);
    return;
  }

  client?.identify(userId, {
    ...baseProperties,
    ...userProperties,
  });
}

/**
 * Reset the PostHog identity on sign-out.
 * Prevents the next sign-in from being associated with this user.
 */
export function reset(): void {
  if (__DEV__) {
    console.log('[Analytics] reset');
    return;
  }

  client?.reset();
}
