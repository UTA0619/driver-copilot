import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Driver Copilot',
  slug: 'driver-copilot',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  // Lock to dark mode — all UI colours are dark-theme only
  userInterfaceStyle: 'dark',
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
      NSCameraUsageDescription:
        'Used to capture offer screenshots directly.',
    },
  },
  android: {
    package: 'com.drivercopilot.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0f172a',
    },
    permissions: [
      // Pre-Android 13
      'READ_EXTERNAL_STORAGE',
      // Android 13+ (targetSdk >= 33)
      'READ_MEDIA_IMAGES',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
    ],
  },
  plugins: [
    'expo-router',
    '@sentry/react-native/expo',
    [
      'expo-image-picker',
      {
        photosPermission: 'Used to analyze offer screenshots.',
        cameraPermission: 'Used to capture offer screenshots.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Driver Copilot uses the camera to capture offer screenshots directly — no app switching needed.',
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Driver Copilot uses your location to center the earnings heatmap.',
        locationWhenInUsePermission:
          'Driver Copilot uses your location to center the earnings heatmap.',
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#3b82f6',
      },
    ],
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsDownloadToken: process.env.MAPBOX_SECRET_TOKEN ?? '',
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
    revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    eas: {
      // Set via: eas init (or add your project ID from expo.dev)
      projectId: process.env.EAS_PROJECT_ID ?? '',
    },
  },
});
