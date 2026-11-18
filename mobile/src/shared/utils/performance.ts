import { InteractionManager, Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

// ===========================================
// Performance Monitoring & Optimization
// ===========================================

// Performance marks for React Native
export const performance = {
  marks: new Map<string, number>(),
  
  mark(name: string) {
    this.marks.set(name, Date.now());
    if (__DEV__) {
      console.log(`📊 Perf mark: ${name}`);
    }
  },
  
  measure(name: string, startMark: string): number {
    const start = this.marks.get(startMark);
    if (!start) return 0;
    
    const duration = Date.now() - start;
    if (__DEV__) {
      console.log(`📊 Perf measure: ${name} = ${duration}ms`);
    }
    
    // Send to Sentry if configured
    if (Sentry && Sentry.metrics) {
      Sentry.metrics.timing(`mobile.${name}`, duration, 'millisecond');
    }
    
    return duration;
  },
  
  clear(name?: string) {
    if (name) {
      this.marks.delete(name);
    } else {
      this.marks.clear();
    }
  },
};

// Lazy load screens to reduce initial bundle
export function createLazyScreen<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  name: string
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    performance.mark(`lazy_load_${name}_start`);
    try {
      const module = await importFn();
      performance.measure(`lazy_load_${name}`, `lazy_load_${name}_start`);
      return module;
    } catch (error) {
      console.error(`Failed to lazy load ${name}:`, error);
      throw error;
    }
  });
}

// Preload screen after idle
export function preloadScreen(importFn: () => Promise<any>, name: string): void {
  InteractionManager.runAfterInteractions(() => {
    performance.mark(`preload_${name}_start`);
    importFn().then(() => {
      performance.measure(`preload_${name}`, `preload_${name}_start`);
      if (__DEV__) {
        console.log(`✅ Preloaded: ${name}`);
      }
    }).catch(err => {
      console.error(`Failed to preload ${name}:`, err);
    });
  });
}

// Image cache optimization
const imageCache = new Map<string, string>();

export function getCachedImage(uri: string): string | null {
  return imageCache.get(uri) || null;
}

export function setCachedImage(uri: string, localUri: string): void {
  imageCache.set(uri, localUri);
  
  // Limit cache size
  if (imageCache.size > 100) {
    const firstKey = imageCache.keys().next().value;
    if (firstKey) imageCache.delete(firstKey);
  }
}

export function clearImageCache(): void {
  imageCache.clear();
}

// Bundle size analyzer (development only)
export function analyzeBundleSize(): void {
  if (!__DEV__) return;
  
  // This would be called during development to track bundle size
  // In production, use: npx expo-bundle-analyzer
  console.log('📦 Bundle analysis:');
  console.log('  - Run: npx expo-bundle-analyzer');
  console.log('  - Or: npx metro-bundle-visualizer');
}

// Memory leak detection
const componentMounts = new Map<string, number>();

export function trackMount(componentName: string): () => void {
  const mountTime = Date.now();
  componentMounts.set(componentName, mountTime);
  
  if (__DEV__) {
    console.log(`🔼 Mount: ${componentName}`);
  }
  
  return () => {
    const unmountTime = Date.now();
    const duration = unmountTime - mountTime;
    componentMounts.delete(componentName);
    
    if (__DEV__ && duration > 30000) { // Warn if mounted > 30s
      console.warn(`⚠️ Long-lived component: ${componentName} (${duration}ms)`);
    }
    
    if (__DEV__) {
      console.log(`🔽 Unmount: ${componentName} (${duration}ms)`);
    }
  };
}

// Frame rate monitor
let frameCount = 0;
let lastFrameTime = Date.now();
let frameRateCallback: ((fps: number) => void) | null = null;

export function startFrameRateMonitor(callback: (fps: number) => void): () => void {
  frameRateCallback = callback;
  
  const measure = () => {
    frameCount++;
    const now = Date.now();
    const elapsed = now - lastFrameTime;
    
    if (elapsed >= 1000) {
      const fps = Math.round((frameCount * 1000) / elapsed);
      if (frameRateCallback) {
        frameRateCallback(fps);
      }
      frameCount = 0;
      lastFrameTime = now;
    }
    
    requestAnimationFrame(measure);
  };
  
  requestAnimationFrame(measure);
  
  return () => {
    frameRateCallback = null;
  };
}

// Network timing
export function timeNetworkRequest<T>(
  requestFn: () => Promise<T>,
  label: string
): Promise<T> {
  performance.mark(`network_${label}_start`);
  
  return requestFn()
    .then(result => {
      performance.measure(`network_${label}`, `network_${label}_start`);
      return result;
    })
    .catch(error => {
      performance.measure(`network_${label}`, `network_${label}_start`);
      throw error;
    });
}

// Database query timing
export function timeDbQuery<T>(
  queryFn: () => Promise<T>,
  label: string
): Promise<T> {
  performance.mark(`db_${label}_start`);
  
  return queryFn()
    .then(result => {
      performance.measure(`db_${label}`, `db_${label}_start`);
      return result;
    })
    .catch(error => {
      performance.measure(`db_${label}`, `db_${label}_start`);
      throw error;
    });
}

// Render optimization helpers
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return React.useCallback(callback, deps);
}

export function useStableMemo<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return React.useMemo(factory, deps);
}

// Debounce for search inputs
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debounced;
}

// Throttle for scroll handlers
export function useThrottle<T>(value: T, limit: number): T {
  const [throttled, setThrottled] = React.useState(value);
  const lastRan = React.useRef(Date.now());
  
  React.useEffect(() => {
    const now = Date.now();
    if (now - lastRan.current >= limit) {
      setThrottled(value);
      lastRan.current = now;
    } else {
      const timer = setTimeout(() => {
        setThrottled(value);
        lastRan.current = Date.now();
      }, limit - (now - lastRan.current));
      return () => clearTimeout(timer);
    }
  }, [value, limit]);
  
  return throttled;
}

// Virtualization helpers for large lists
export const VIRTUALIZATION_CONFIG = {
  windowSize: 10,
  maxToRenderPerBatch: 5,
  initialNumToRender: 8,
  removeClippedSubviews: true,
  updateCellsBatchingPeriod: 50,
};

// Image optimization config
export const IMAGE_CONFIG = {
  // Use expo-image for better caching
  component: 'expo-image',
  // Default placeholders
  placeholder: 'blur',
  // Cache policy
  cachePolicy: 'memory-disk',
  // Transitions
  transition: 200,
};

// Performance budgets (in ms)
export const PERFORMANCE_BUDGETS = {
  appStart: 2000,
  screenTransition: 300,
  apiRequest: 1000,
  dbQuery: 500,
  imageLoad: 2000,
  frameRate: 55, // minimum FPS
};

// Check if performance budget exceeded
export function checkPerformanceBudget(metric: keyof typeof PERFORMANCE_BUDGETS, value: number): boolean {
  const budget = PERFORMANCE_BUDGETS[metric];
  return value <= budget;
}

// Export React for lazy
import React from 'react';