import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = Constants.expoConfig?.extra?.sentryDsn as string | undefined;
const appEnv = (Constants.expoConfig?.extra?.appEnv as string) ?? 'development';

export function initSentry(): void {
  if (!dsn) {
    if (__DEV__) {
      console.warn('[Sentry] DSN not configured — crash reporting disabled. Set EXPO_PUBLIC_SENTRY_DSN.');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: appEnv,
    enabled: appEnv !== 'development',
    // Production: 20% trace sampling. Staging: 5% (avoid quota during QA).
    tracesSampleRate: appEnv === 'production' ? 0.2 : 0.05,
    debug: false,

    // Strip PII from events before they leave the device
    beforeSend(event) {
      // Remove auth-related error messages that may contain email addresses
      if (event.exception?.values) {
        event.exception.values = event.exception.values.map((e) => ({
          ...e,
          value: e.value
            ?.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[email]') // strip emails
            ?.replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [token]'), // strip tokens
        }));
      }
      return event;
    },

    // Don't attach user email to Sentry events
    initialScope: {
      tags: {
        app_env: appEnv,
        app_version: Constants.expoConfig?.version ?? 'unknown',
      },
    },
  });
}

/**
 * Manually capture an error with optional context.
 * Use this for errors that are caught but still warrant Sentry reporting.
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>,
): void {
  if (appEnv === 'development') {
    console.error('[Sentry.captureError]', error, context);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, val]) => scope.setExtra(key, val));
    }
    Sentry.captureException(error);
  });
}

export { Sentry };
