import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

// Sentry configuration for mobile app
// This runs in the JavaScript context (Hermes)

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn || dsn === 'https://your-sentry-dsn@sentry.io/project') {
    console.log('⚠️ Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn,
    
    // Environment
    environment: __DEV__ ? 'development' : 'production',
    
    // Release tracking
    release: process.env.APP_VERSION || '1.0.0',
    dist: process.env.BUILD_NUMBER || '1',
    
    // Sampling
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    profilesSampleRate: __DEV__ ? 1.0 : 0.1,
    
    // Error filtering
    beforeSend(event, hint) {
      // Don't send errors in development
      if (__DEV__) {
        console.log('Sentry error (dev):', event.exception?.values?.[0]?.value);
        return null;
      }
      
      // Filter out known non-critical errors
      const error = hint.originalException;
      if (error instanceof Error) {
        // Ignore network errors that are expected
        if (error.message.includes('Network request failed')) {
          return null;
        }
        // Ignore cancelled requests
        if (error.name === 'AbortError' || error.message.includes('cancelled')) {
          return null;
        }
      }
      
      return event;
    },
    
    // Context
    initialScope: {
      tags: {
        platform: Platform.OS,
        app: 'entregafacil-mobile',
      },
      user: {
        // Will be set after authentication
      },
    },
    
    // Native crash handling
    enableNative: true,
    nativeCrashHandling: true,
    
    // ANR detection (Android)
    anrEnabled: Platform.OS === 'android',
    
    // Performance monitoring
    enableAutoPerformanceTracing: true,
    
    // Debug
    debug: __DEV__,
  });
  
  console.log('✅ Sentry initialized');
}

// Set user context after authentication
export function setSentryUser(user: { id: string; email: string; role: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

// Clear user context on logout
export function clearSentryUser() {
  Sentry.setUser(null);
}

// Add breadcrumb for debugging
export function addBreadcrumb(category: string, message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

// Capture message
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

// Capture exception with context
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

// Start transaction for performance monitoring
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op,
  });
}

// Set tag
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

// Set context
export function setContext(key: string, value: Record<string, any>) {
  Sentry.setContext(key, value);
}

// Measure performance
export function measurePerformance(name: string, fn: () => Promise<any>) {
  return Sentry.measure(name, fn);
}

export default Sentry;