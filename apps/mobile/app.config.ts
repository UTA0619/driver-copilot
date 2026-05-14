import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Driver Copilot',
  slug: 'driver-copilot',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0f172a',
  },
  ios: {
    bundleIdentifier: 'com.drivercopilot.app',
    supportsTablet: false,
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        'Used to analyze offer screenshots and give you a recommendation.',
      NSLocationWhenInUseUsageDescription:
        'Used to show your position on the earnings heatmap.',
    },
  },
  android: {
    package: 'com.drivercopilot.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0f172a',
    },
    permissions: [
      'READ_EXTERNAL_STORAGE',
      'ACCESS_FINE_LOCATION',
    ],
  },
  plugins: [
    'expo-router',
    'sentry-expo',
    [
      'expo-image-picker',
      { photosPermission: 'Used to analyze offer screenshots.' },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    eas: {
      projectId: 'REPLACE_WITH_EAS_PROJECT_ID',
    },
  },
});
