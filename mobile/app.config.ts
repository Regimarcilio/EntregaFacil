import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isPreview = process.env.NODE_ENV === 'staging';
  const appVersion = process.env.APP_VERSION || '1.0.0';
  const buildNumber = process.env.BUILD_NUMBER || '1';

  return {
    ...config,
    name: isProduction ? 'EntregaFácil' : isPreview ? 'EntregaFácil (Preview)' : 'EntregaFácil (Dev)',
    slug: 'entregafacil',
    version: appVersion,
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
      bundleIdentifier: isProduction 
        ? 'com.entregafacil.app' 
        : isPreview 
          ? 'com.entregafacil.app.preview' 
          : 'com.entregafacil.app.dev',
      buildNumber: buildNumber,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'EntregaFácil precisa da sua localização para navegação e comprovação de entregas',
        NSLocationAlwaysAndWhenInUseUsageDescription: 'EntregaFácil precisa da localização em background para navegação contínua',
        NSCameraUsageDescription: 'EntregaFácil usa a câmera para capturar fotos de comprovação de entrega',
        NSPhotoLibraryUsageDescription: 'EntregaFácil acessa a galeria para anexar fotos de comprovação',
        NSPhotoLibraryAddUsageDescription: 'EntregaFácil salva fotos de comprovação na galeria',
        UIBackgroundModes: ['location', 'fetch', 'remote-notification'],
        ITSAppUsesNonExemptEncryption: false,
        CFBundleShortVersionString: appVersion,
        CFBundleVersion: buildNumber,
      },
      associatedDomains: ['applinks:entregafacil.app'],
      usesAppleSignIn: true,
      supportsTablet: false,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0066CC',
      },
      package: isProduction 
        ? 'com.entregafacil.app' 
        : isPreview 
          ? 'com.entregafacil.app.preview' 
          : 'com.entregafacil.app.dev',
      versionCode: parseInt(buildNumber),
      versionName: appVersion,
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
        'POST_NOTIFICATIONS',
        'SCHEDULE_EXACT_ALARM',
        'USE_EXACT_ALARM',
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
      googleServicesFile: isProduction 
        ? './google-services.json' 
        : isPreview 
          ? './google-services-staging.json' 
          : './google-services-dev.json',
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
          isIosBackgroundLocationEnabled: true,
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
          mode: 'production',
        },
      ],
      [
        'expo-updates',
        {
          username: 'entregafacil',
          checkAutomatically: 'ON_LOAD',
          fallbackToCacheTimeout: 30000,
        },
      ],
      [
        '@maplibre/maplibre-react-native',
        {
          // MapLibre React Native config
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            enableProguardInReleaseBuilds: true,
            shrinkResources: true,
            minifyEnabled: true,
            extraMavenRepos: [
              '../../node_modules/@maplibre/maplibre-react-native/android',
            ],
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            buildToolsVersion: '34.0.0',
            kotlinVersion: '1.9.20',
            ndkVersion: '26.1.10909125',
          },
          ios: {
            useFrameworks: 'static',
            deploymentTarget: '15.1',
            cocopodsFlags: '--use-libraries',
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true,
      reactCompiler: false,
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.entregafacil.app',
      evolutionUrl: process.env.EXPO_PUBLIC_EVOLUTION_URL || 'https://evolution.entregafacil.app',
      mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
      buildProfile: process.env.EAS_BUILD_PROFILE,
      sentryDsn: process.env.SENTRY_DSN,
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
      codeSigningCertificate: process.env.EXPO_UPDATES_CODE_SIGNING_CERT,
      codeSigningMetadata: {
        alg: 'RSASSA-PKCS1-v1_5',
        keyid: 'main',
      },
    },
  };
};