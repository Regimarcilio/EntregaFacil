// Sentry Native Configuration for Android/iOS
// This file is used by the native layer (expo-sentry)

export default {
  // Android configuration
  android: {
    // Enable native crash handling
    enableNativeCrashHandling: true,
    
    // ANR detection
    anrEnabled: true,
    anrTimeout: 5000, // 5 seconds
    
    // NDK stack traces
    ndkStacktracesEnabled: true,
    
    // Debug metadata
    debugMetadata: {
      // Include debug symbols in upload
      includeDebugMetadata: true,
    },
  },
  
  // iOS configuration
  ios: {
    // Enable native crash handling
    enableNativeCrashHandling: true,
    
    // Enable swizzling for automatic instrumentation
    enableAutoSessionTracking: true,
    
    // Track UI lifecycle
    trackUIViewControllers: true,
    
    // Debug symbols
    debugSymbols: {
      uploadDebugSymbols: true,
    },
  },
  
  // Common configuration
  common: {
    // DSN will be set from JS layer
    dsn: process.env.SENTRY_DSN,
    
    // Release
    release: process.env.APP_VERSION || '1.0.0',
    dist: process.env.BUILD_NUMBER || '1',
    
    // Environment
    environment: __DEV__ ? 'development' : 'production',
    
    // Sampling
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    profilesSampleRate: __DEV__ ? 1.0 : 0.1,
    
    // Attach stack traces
    attachStacktrace: true,
    
    // Before send hook
    beforeSend: (event) => {
      // Filter in development
      if (__DEV__) {
        return null;
      }
      return event;
    },
  },
};