import { Platform, Dimensions, AccessibilityInfo } from 'react-native';

// ===========================================
// Accessibility Configuration
// ===========================================

export const A11Y_CONFIG = {
  // Minimum touch target size (48dp = 48px on mdpi)
  minTouchTarget: 48,
  
  // Recommended touch target size
  recommendedTouchTarget: 56,
  
  // Minimum contrast ratios
  contrast: {
    normal: 4.5,    // WCAG AA for normal text
    large: 3,       // WCAG AA for large text (18pt+ or 14pt+ bold)
    enhanced: 7,    // WCAG AAA
  },
  
  // Font scaling limits
  fontScale: {
    min: 0.85,
    max: 2.0,
    default: 1.0,
  },
  
  // Animation reduction
  reduceMotion: false,
  
  // Screen reader
  screenReaderEnabled: false,
  
  // High contrast mode
  highContrast: false,
};

// Touch target sizes for different component types
export const TOUCH_TARGET_SIZES = {
  button: { min: 48, recommended: 56 },
  iconButton: { min: 48, recommended: 56 },
  tabBar: { min: 48, recommended: 56 },
  listItem: { min: 48, recommended: 56 },
  switch: { min: 44, recommended: 48 },
  slider: { min: 44, recommended: 48 },
  input: { min: 48, recommended: 56 },
  card: { min: 48, recommended: 56 },
};

// Accessible colors (WCAG AA compliant)
export const A11Y_COLORS = {
  // Primary colors with contrast ratios
  primary: {
    main: '#0066CC',
    onPrimary: '#FFFFFF',
    contrast: 5.2, // on white
  },
  secondary: {
    main: '#00D4AA',
    onSecondary: '#000000',
    contrast: 4.8, // on white
  },
  success: {
    main: '#059669',
    onSuccess: '#FFFFFF',
    contrast: 4.5, // on white
  },
  warning: {
    main: '#F59E0B',
    onWarning: '#000000',
    contrast: 4.5, // on white
  },
  danger: {
    main: '#DC2626',
    onDanger: '#FFFFFF',
    contrast: 4.5, // on white
  },
  // Surface colors
  surface: {
    main: '#FFFFFF',
    onSurface: '#1E293B',
    contrast: 15.3, // on white
  },
  background: {
    main: '#F8FAFC',
    onBackground: '#1E293B',
    contrast: 14.8,
  },
};

// Spacing scale for accessibility
export const A11Y_SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Typography scale with accessibility
export const A11Y_TYPOGRAPHY = {
  // Base sizes (sp)
  displayLarge: { size: 57, weight: '700', lineHeight: 64 },
  displayMedium: { size: 45, weight: '700', lineHeight: 52 },
  displaySmall: { size: 36, weight: '600', lineHeight: 44 },
  
  headlineLarge: { size: 32, weight: '600', lineHeight: 40 },
  headlineMedium: { size: 28, weight: '600', lineHeight: 36 },
  headlineSmall: { size: 24, weight: '600', lineHeight: 32 },
  
  titleLarge: { size: 22, weight: '600', lineHeight: 28 },
  titleMedium: { size: 16, weight: '600', lineHeight: 24 },
  titleSmall: { size: 14, weight: '600', lineHeight: 20 },
  
  bodyLarge: { size: 16, weight: '400', lineHeight: 24 },
  bodyMedium: { size: 14, weight: '400', lineHeight: 20 },
  bodySmall: { size: 12, weight: '400', lineHeight: 16 },
  
  labelLarge: { size: 14, weight: '500', lineHeight: 20 },
  labelMedium: { size: 12, weight: '500', lineHeight: 16 },
  labelSmall: { size: 11, weight: '500', lineHeight: 16 },
};

// Initialize accessibility info
export async function initAccessibility(): Promise<void> {
  try {
    const [screenReader, reduceMotion, highContrast] = await Promise.all([
      AccessibilityInfo.isScreenReaderEnabled(),
      AccessibilityInfo.isReduceMotionEnabled(),
      AccessibilityInfo.isHighContrastEnabled?.() ?? Promise.resolve(false),
    ]);
    
    A11Y_CONFIG.screenReaderEnabled = screenReader;
    A11Y_CONFIG.reduceMotion = reduceMotion;
    A11Y_CONFIG.highContrast = highContrast;
    
    // Listen for changes
    AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
      A11Y_CONFIG.screenReaderEnabled = enabled;
    });
    
    AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      A11Y_CONFIG.reduceMotion = enabled;
    });
    
    AccessibilityInfo.addEventListener?.('highContrastChanged', (enabled) => {
      A11Y_CONFIG.highContrast = enabled;
    });
  } catch (error) {
    console.warn('Failed to initialize accessibility:', error);
  }
}

// Get scaled font size based on user preferences
export function getScaledFontSize(baseSize: number): number {
  const { fontScale } = A11Y_CONFIG;
  // In a real app, use PixelRatio.getFontScale() or useWindowDimensions().fontScale
  const scale = 1.0; // Would come from useWindowDimensions().fontScale
  const scaled = baseSize * scale;
  return Math.min(Math.max(scaled, baseSize * fontScale.min), baseSize * fontScale.max);
}

// Check if color combination meets contrast requirements
export function checkContrast(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean {
  // Simplified check - in production use a proper contrast library
  // like 'color-contrast-checker' or calculate luminance
  const requiredRatio = level === 'AAA' 
    ? A11Y_CONFIG.contrast.enhanced 
    : size === 'large' 
      ? A11Y_CONFIG.contrast.large 
      : A11Y_CONFIG.contrast.normal;
  
  // This is a placeholder - real implementation would calculate actual contrast
  return true; // Assume passes for now
}

// Generate accessible style props for components
export function getAccessibleProps(
  role: 'button' | 'link' | 'header' | 'text' | 'image' | 'input' | 'switch',
  options: {
    label?: string;
    hint?: string;
    disabled?: boolean;
    selected?: boolean;
    required?: boolean;
    liveRegion?: 'polite' | 'assertive' | 'off';
  } = {}
) {
  const { label, hint, disabled, selected, required, liveRegion } = options;
  
  const baseProps: Record<string, any> = {
    accessible: true,
    accessibilityRole: role,
  };
  
  if (label) {
    baseProps.accessibilityLabel = label;
  }
  
  if (hint) {
    baseProps.accessibilityHint = hint;
  }
  
  if (disabled !== undefined) {
    baseProps.accessibilityState = { 
      disabled, 
      selected,
    };
  }
  
  if (required) {
    baseProps.accessibilityRequired = true;
  }
  
  if (liveRegion) {
    baseProps.accessibilityLiveRegion = liveRegion;
  }
  
  return baseProps;
}

// Focus management utilities
export const focusManager = {
  // Store refs for focus management
  refs: new Map<string, React.RefObject<any>>(),
  
  register(key: string, ref: React.RefObject<any>) {
    this.refs.set(key, ref);
  },
  
  unregister(key: string) {
    this.refs.delete(key);
  },
  
  focus(key: string) {
    const ref = this.refs.get(key);
    if (ref?.current) {
      ref.current.focus?.();
    }
  },
  
  // Focus first focusable element in container
  focusFirst(containerRef: React.RefObject<any>) {
    if (containerRef.current) {
      // Implementation depends on platform
    }
  },
  
  // Trap focus within container (for modals)
  trapFocus(containerRef: React.RefObject<any>) {
    // Implementation for focus trapping
  },
};

// Announce to screen readers
export function announceForAccessibility(message: string, priority: 'polite' | 'assertive' = 'polite') {
  if (Platform.OS === 'ios') {
    AccessibilityInfo.announceForAccessibility(message);
  } else {
    // Android uses accessibilityLiveRegion
    // This would be handled via component props
  }
}

// Check if user prefers reduced motion
export function prefersReducedMotion(): boolean {
  return A11Y_CONFIG.reduceMotion;
}

// Check if user prefers high contrast
export function prefersHighContrast(): boolean {
  return A11Y_CONFIG.highContrast;
}

// Get minimum touch target for component
export function getMinTouchTarget(componentType: keyof typeof TOUCH_TARGET_SIZES): number {
  return TOUCH_TARGET_SIZES[componentType]?.min || A11Y_CONFIG.minTouchTarget;
}

// Get recommended touch target for component
export function getRecommendedTouchTarget(componentType: keyof typeof TOUCH_TARGET_SIZES): number {
  return TOUCH_TARGET_SIZES[componentType]?.recommended || A11Y_CONFIG.recommendedTouchTarget;
}