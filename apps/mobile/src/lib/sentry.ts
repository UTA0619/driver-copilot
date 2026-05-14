import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = Constants.expoConfig?.extra?.sentryDsn as string | undefined;
const appEnv = (Constants.expoConfig?.extra?.appEnv as string) ?? 'development';

export function initSentry() {
  if (!dsn) {
    console.warn('[Sentry] DSN not configured. Set EXPO_PUBLIC_SENTRY_DSN in .env.local');
    return;
  }

  Sentry.init({
    dsn,
    environment: appEnv,
    // Disable in development to avoid noise
    enabled: appEnv !== 'development',
    tracesSampleRate: appEnv === 'production' ? 0.2 : 1.0,
    debug: false,
  });
}

export { Sentry };
