import { DefaultTheme, DarkTheme } from 'react-native-paper';

export const colors = {
  primary: '#0066CC',
  primaryLight: '#4DA3FF',
  primaryDark: '#004499',
  secondary: '#00D4AA',
  secondaryLight: '#4DE8C4',
  secondaryDark: '#00A380',
  accent: '#FF6B35',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  error: '#DC2626',
  errorLight: '#FEF2F2',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  success: '#059669',
  successLight: '#ECFDF5',
  text: '#0F172A',
  textSecondary: '#475569',
  textDisabled: '#94A3B8',
  border: '#E2E8F0',
  borderFocus: '#0066CC',
  overlay: 'rgba(15, 23, 42, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const darkColors = {
  ...colors,
  primary: '#4DA3FF',
  primaryLight: '#7BC0FF',
  primaryDark: '#1E90FF',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceVariant: '#334155',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textDisabled: '#64748B',
  border: '#334155',
  borderFocus: '#4DA3FF',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
    xxl: 36,
    xxxl: 40,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    bold: '700',
  },
};

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 2.5,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 5.0,
    elevation: 5,
  },
  xl: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 10.0,
    elevation: 8,
  },
};

export const darkShadows = {
  sm: {
    shadowColor: darkColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: darkColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 2.5,
    elevation: 3,
  },
  lg: {
    shadowColor: darkColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5.0,
    elevation: 5,
  },
  xl: {
    shadowColor: darkColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 10.0,
    elevation: 8,
  },
};

export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryLight,
    secondary: colors.secondary,
    secondaryContainer: colors.secondaryLight,
    tertiary: colors.accent,
    error: colors.error,
    errorContainer: colors.errorLight,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    onPrimary: '#FFFFFF',
    onPrimaryContainer: colors.primaryDark,
    onSecondary: '#FFFFFF',
    onSecondaryContainer: colors.secondaryDark,
    onTertiary: '#FFFFFF',
    onError: '#FFFFFF',
    onErrorContainer: colors.error,
    onBackground: colors.text,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    outlineVariant: colors.border,
    shadow: colors.shadow,
    scrim: colors.overlay,
    inverseSurface: darkColors.surface,
    inverseOnSurface: darkColors.text,
    inversePrimary: darkColors.primary,
  },
  roundness: borderRadius.md,
  animation: { scale: 1.0 },
};

export const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: darkColors.primary,
    primaryContainer: darkColors.primaryDark,
    secondary: darkColors.secondary,
    secondaryContainer: darkColors.secondaryDark,
    tertiary: colors.accent,
    error: colors.error,
    errorContainer: colors.errorLight,
    background: darkColors.background,
    surface: darkColors.surface,
    surfaceVariant: darkColors.surfaceVariant,
    onPrimary: '#000000',
    onPrimaryContainer: darkColors.primaryLight,
    onSecondary: '#000000',
    onSecondaryContainer: darkColors.secondaryLight,
    onTertiary: '#FFFFFF',
    onError: '#FFFFFF',
    onErrorContainer: colors.error,
    onBackground: darkColors.text,
    onSurface: darkColors.text,
    onSurfaceVariant: darkColors.textSecondary,
    outline: darkColors.border,
    outlineVariant: darkColors.border,
    shadow: darkColors.shadow,
    scrim: darkColors.overlay,
    inverseSurface: colors.surface,
    inverseOnSurface: colors.text,
    inversePrimary: colors.primary,
  },
  roundness: borderRadius.md,
  animation: { scale: 1.0 },
};

export type ThemeColors = typeof colors;
export type ThemeSpacing = typeof spacing;
export type ThemeTypography = typeof typography;
export type ThemeShadows = typeof shadows;

declare module 'react-native-paper' {
  export interface ThemeColors {
    primary: string;
    primaryContainer: string;
    secondary: string;
    secondaryContainer: string;
    tertiary: string;
    error: string;
    errorContainer: string;
    warning: string;
    warningContainer: string;
    success: string;
    successContainer: string;
  }
}