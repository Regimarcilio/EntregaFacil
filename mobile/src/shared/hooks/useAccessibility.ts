import { useState, useEffect, useCallback } from 'react';
import { AccessibilityInfo, Platform, ScaledSize } from 'react-native';
import { 
  A11Y_CONFIG, 
  A11Y_TYPOGRAPHY, 
  getAccessibleProps, 
  announceForAccessibility,
  prefersReducedMotion,
  prefersHighContrast,
  initAccessibility,
} from '../constants/accessibility';

interface AccessibilityState {
  screenReaderEnabled: boolean;
  reduceMotionEnabled: boolean;
  highContrastEnabled: boolean;
  fontScale: number;
  windowDimensions: ScaledSize;
}

export function useAccessibility() {
  const [state, setState] = useState<AccessibilityState>({
    screenReaderEnabled: false,
    reduceMotionEnabled: false,
    highContrastEnabled: false,
    fontScale: 1.0,
    windowDimensions: { width: 0, height: 0, scale: 1, fontScale: 1 },
  });

  // Initialize accessibility
  useEffect(() => {
    initAccessibility().then(() => {
      // Update initial state
      Promise.all([
        AccessibilityInfo.isScreenReaderEnabled(),
        AccessibilityInfo.isReduceMotionEnabled(),
        AccessibilityInfo.isHighContrastEnabled?.() ?? Promise.resolve(false),
      ]).then(([screenReader, reduceMotion, highContrast]) => {
        setState(prev => ({
          ...prev,
          screenReaderEnabled: screenReader,
          reduceMotionEnabled: reduceMotion,
          highContrastEnabled: highContrast,
        }));
      });
    });

    // Listen for changes
    const screenReaderListener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => setState(prev => ({ ...prev, screenReaderEnabled: enabled }))
    );

    const reduceMotionListener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setState(prev => ({ ...prev, reduceMotionEnabled: enabled }))
    );

    const highContrastListener = AccessibilityInfo.addEventListener?.(
      'highContrastChanged',
      (enabled) => setState(prev => ({ ...prev, highContrastEnabled: enabled }))
    );

    // Font scale listener (iOS)
    const fontScaleListener = AccessibilityInfo.addEventListener?.(
      'fontScaleChanged',
      (scale) => setState(prev => ({ ...prev, fontScale: scale }))
    );

    return () => {
      screenReaderListener?.remove();
      reduceMotionListener?.remove();
      highContrastListener?.remove();
      fontScaleListener?.remove();
    };
  }, []);

  // Announce message to screen reader
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announceForAccessibility(message, priority);
  }, []);

  // Get accessible props for a component
  const getA11yProps = useCallback((
    role: 'button' | 'link' | 'header' | 'text' | 'image' | 'input' | 'switch',
    options: {
      label?: string;
      hint?: string;
      disabled?: boolean;
      selected?: boolean;
      required?: boolean;
      liveRegion?: 'polite' | 'assertive' | 'off';
    } = {}
  ) => getAccessibleProps(role, options), []);

  // Check if animation should be reduced
  const shouldReduceMotion = useCallback(() => {
    return state.reduceMotionEnabled || A11Y_CONFIG.reduceMotion;
  }, [state.reduceMotionEnabled]);

  // Check if high contrast mode
  const isHighContrast = useCallback(() => {
    return state.highContrastEnabled || A11Y_CONFIG.highContrast;
  }, [state.highContrastEnabled]);

  // Get scaled font size
  const getFontSize = useCallback((baseSize: number) => {
    return baseSize * state.fontScale;
  }, [state.fontScale]);

  // Get accessible color based on contrast mode
  const getAccessibleColor = useCallback((
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'surface' | 'background',
    variant: 'main' | 'onColor' = 'main'
  ) => {
    const colors = A11Y_COLORS[color];
    if (!colors) return color;
    
    const key = variant === 'main' ? 'main' : `on${color.charAt(0).toUpperCase() + color.slice(1)}`;
    return colors[key as keyof typeof colors] || colors.main;
  }, []);

  return {
    // State
    ...state,
    isScreenReaderEnabled: state.screenReaderEnabled,
    isReduceMotionEnabled: state.reduceMotionEnabled,
    isHighContrastEnabled: state.highContrastEnabled,
    fontScale: state.fontScale,

    // Actions
    announce,
    getA11yProps,

    // Helpers
    shouldReduceMotion,
    isHighContrast,
    getFontSize,
    getAccessibleColor,
    prefersReducedMotion: prefersReducedMotion(),
    prefersHighContrast: prefersHighContrast(),

    // Typography
    typography: A11Y_TYPOGRAPHY,
  };
}

// Hook for accessible touch targets
export function useAccessibleTouchTarget(
  componentType: keyof typeof import('../constants/accessibility').TOUCH_TARGET_SIZES = 'button'
) {
  const { isHighContrastEnabled, isReduceMotionEnabled } = useAccessibility();
  
  const touchTarget = import('../constants/accessibility').TOUCH_TARGET_SIZES[componentType] || { 
    min: 48, 
    recommended: 56 
  };

  return {
    minHeight: touchTarget.min,
    minWidth: touchTarget.min,
    recommendedHeight: touchTarget.recommended,
    recommendedWidth: touchTarget.recommended,
    // Increase for high contrast or motor impairments
    adjustedMinHeight: isHighContrastEnabled ? touchTarget.min + 8 : touchTarget.min,
    adjustedMinWidth: isHighContrastEnabled ? touchTarget.min + 8 : touchTarget.min,
    // Disable animations if reduced motion
    animationDuration: isReduceMotionEnabled ? 0 : 200,
  };
}

// Hook for accessible form fields
export function useAccessibleFormField(
  label: string,
  options: {
    required?: boolean;
    error?: string;
    hint?: string;
    disabled?: boolean;
  } = {}
) {
  const { getA11yProps, announce } = useAccessibility();
  const { required, error, hint, disabled } = options;

  const inputProps = getA11yProps('input', {
    label,
    hint,
    disabled,
    required,
    liveRegion: error ? 'assertive' : 'polite',
  });

  const errorProps = error ? getA11yProps('text', {
    label: `Erro: ${error}`,
    liveRegion: 'assertive',
  }) : null;

  const announceError = useCallback(() => {
    if (error) {
      announce(`Erro no campo ${label}: ${error}`, 'assertive');
    }
  }, [announce, error, label]);

  return {
    inputProps,
    errorProps,
    announceError,
    accessibilityState: {
      disabled,
      invalid: !!error,
      required,
    },
  };
}

// Hook for accessible buttons
export function useAccessibleButton(
  label: string,
  options: {
    hint?: string;
    disabled?: boolean;
    loading?: boolean;
    pressed?: boolean;
    onPress?: () => void;
  } = {}
) {
  const { getA11yProps, announce } = useAccessibility();
  const { hint, disabled, loading, pressed, onPress } = options;

  const buttonProps = getA11yProps('button', {
    label: loading ? 'Carregando' : label,
    hint,
    disabled: disabled || loading,
  });

  const handlePress = useCallback(() => {
    if (!disabled && !loading && onPress) {
      onPress();
      // Announce action for screen readers
      announce(label, 'polite');
    }
  }, [announce, disabled, loading, label, onPress]);

  return {
    ...buttonProps,
    onPress: handlePress,
    accessibilityState: {
      disabled: disabled || loading,
      busy: loading,
      pressed,
    },
  };
}

// Import A11Y_COLORS
import { A11Y_COLORS } from '../constants/accessibility';