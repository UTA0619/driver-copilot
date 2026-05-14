import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

const posthogKey = Constants.expoConfig?.extra?.posthogKey as string | undefined;
const posthogHost = (Constants.expoConfig?.extra?.posthogHost as string) ?? 'https://app.posthog.com';
const appEnv = (Constants.expoConfig?.extra?.appEnv as string) ?? 'development';

// Base properties attached to every event
const baseProperties = {
  app_env: appEnv,
  app_version: Constants.expoConfig?.version ?? 'unknown',
};

let client: PostHog | null = null;

export function initPostHog(): PostHog | null {
  if (!posthogKey) {
    console.warn('[PostHog] Key not configured. Set EXPO_PUBLIC_POSTHOG_KEY in .env.local');
    return null;
  }

  client = new PostHog(posthogKey, {
    host: posthogHost,
    // Disable in development so local usage doesn't pollute analytics
    disabled: appEnv === 'development',
  });

  return client;
}

export function getPostHog(): PostHog | null {
  return client;
}

// Typed event capture — use these helpers instead of calling client directly
export function capture(
  event: string,
  properties?: Record<string, unknown>,
) {
  client?.capture(event, { ...baseProperties, ...properties });
}

export function identify(userId: string, userProperties?: Record<string, unknown>) {
  client?.identify(userId, userProperties);
}

export function reset() {
  client?.reset();
}
