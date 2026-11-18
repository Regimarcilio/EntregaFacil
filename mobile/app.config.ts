import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'EntregaFácil',
  slug: 'entregafacil',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0066CC',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.entregafacil.app',
    buildNumber: '1',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'EntregaFácil precisa da sua localização para navegação e comprovação de entregas',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'EntregaFácil precisa da localização em background para navegação contínua',
      NSCameraUsageDescription: 'EntregaFácil usa a câmera para capturar fotos de comprovação de entrega',
      NSPhotoLibraryUsageDescription: 'EntregaFácil acessa a galeria para anexar fotos de comprovação',
      NSPhotoLibraryAddUsageDescription: 'EntregaFácil salva fotos de comprovação na galeria',
      UIBackgroundModes: ['location', 'fetch', 'remote-notification'],
      ITSAppUsesNonExemptEncryption: false,
    },
    associatedDomains: ['applinks:entregafacil.app'],
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0066CC',
    },
    package: 'com.entregafacil.app',
    versionCode: 1,
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'CAMERA',
      'WRITE_EXTERNAL_STORAGE',
      'READ_EXTERNAL_STORAGE',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
      'VIBRATE',
      'RECEIVE_BOOT_COMPLETED',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'entregafacil.app',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Allow EntregaFácil to use your location',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Allow EntregaFácil to access your camera',
        microphonePermission: 'Allow EntregaFácil to access your microphone',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#0066CC',
        sounds: ['./assets/notification.wav'],
      },
    ],
    [
      'expo-updates',
      {
        username: 'entregafacil',
      },
    ],
    [
      '@maplibre/maplibre-react-native',
      {
        // MapLibre React Native config
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    tsconfigPaths: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.entregafacil.app',
    evolutionUrl: process.env.EXPO_PUBLIC_EVOLUTION_URL || 'https://evolution.entregafacil.app',
    mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
  owner: 'entregafacil',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/entregafacil',
    fallbackToCacheTimeout: 30000,
    checkAutomatically: 'ON_LOAD',
    enabled: true,
  },
});