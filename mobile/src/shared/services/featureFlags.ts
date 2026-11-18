import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ===========================================
// Feature Flags System
// ===========================================

export type FeatureFlagKey = 
  | 'new_map_style'
  | 'voice_navigation_v2'
  | 'offline_sync_v2'
  | 'whatsapp_templates'
  | 'route_optimization_ml'
  | 'push_notifications_rich'
  | 'dark_mode_scheduler'
  | 'analytics_events'
  | 'crash_reporting'
  | 'beta_features';

export interface FeatureFlag {
  key: FeatureFlagKey;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  platforms?: ('ios' | 'android')[];
  minAppVersion?: string;
  maxAppVersion?: string;
  targetGroups?: string[]; // 'all', 'beta', 'internal', 'drivers'
  dependencies?: FeatureFlagKey[];
  expiresAt?: string; // ISO date
  createdAt: string;
  updatedAt: string;
}

// Default feature flags configuration
const DEFAULT_FLAGS: Record<FeatureFlagKey, FeatureFlag> = {
  new_map_style: {
    key: 'new_map_style',
    name: 'Novo Estilo de Mapa',
    description: 'Estilo visual atualizado do mapa com melhor contraste',
    enabled: true,
    rolloutPercentage: 100,
    platforms: ['ios', 'android'],
    targetGroups: ['all'],
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2024-11-18T00:00:00Z',
  },
  voice_navigation_v2: {
    key: 'voice_navigation_v2',
    name: 'Navegação por Voz v2',
    description: 'Nova engine de voz com melhor pronúncia de endereços brasileiros',
    enabled: true,
    rolloutPercentage: 50,
    platforms: ['ios', 'android'],
    minAppVersion: '1.0.0',
    targetGroups: ['beta', 'drivers'],
    createdAt: '2024-11-10T00:00:00Z',
    updatedAt: '2024-11-18T00:00:00Z',
  },
  offline_sync_v2: {
    key: 'offline_sync_v2',
    name: 'Sync Offline v2',
    description: 'Sincronização em background com compressão delta',
    enabled: true,
    rolloutPercentage: 100,
    platforms: ['ios', 'android'],
    targetGroups: ['all'],
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2024-11-15T00:00:00Z',
  },
  whatsapp_templates: {
    key: 'whatsapp_templates',
    name: 'Templates WhatsApp',
    description: 'Editor visual de templates com preview em tempo real',
    enabled: true,
    rolloutPercentage: 100,
    platforms: ['ios', 'android'],
    targetGroups: ['all'],
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2024-11-18T00:00:00Z',
  },
  route_optimization_ml: {
    key: 'route_optimization_ml',
    name: 'Otimização ML',
    description: 'Otimização de rotas usando Machine Learning para prever tráfego',
    enabled: false,
    rolloutPercentage: 0,
    platforms: ['ios', 'android'],
    minAppVersion: '1.1.0',
    targetGroups: ['internal'],
    createdAt: '2024-11-15T00:00:00Z',
    updatedAt: '2024-11-18T00:00:00Z',
  },
  push_notifications_rich: {
    key: 'push_notifications_rich',
    name: 'Notificações Ricas',
    description: 'Notificações com imagens, botões de ação e agrupamento',
    enabled: true,
    rolloutPercentage: 75,
    platforms: ['ios', 'android'],
    targetGroups: ['all'],
    createdAt: '2024-11-05T00:00:00Z',
    updatedAt: '2024-11-18T00:00:00Z',
  },
  dark_mode_scheduler: {
    key: 'dark_mode_scheduler',
    name: 'Agendador Modo Escuro',
    description: 'Troca automática de tema baseada no horário do dia',
    enabled: true,
    rolloutPercentage: 100,
    platforms: ['ios', 'android'],
    targetGroups: ['all'],
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2024-11-18T00:00:00Z',
  },
  analytics_events: {
    key: 'analytics_events',
    name: 'Eventos de Analytics',
    description: 'Tracking detalhado de uso para melhorias de produto',
    enabled: true,
    rolloutPercentage: 100,
    platforms: ['ios', 'android'],
    targetGroups: ['all'],
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2024-11-18T00:00:00Z',
  },
  crash_reporting: {
    key: 'crash_reporting',
    name: 'Relatório de Crashes',
    description: 'Captura automática de erros e crashes com Sentry',
    enabled: true,
    rolloutPercentage: 100,
    platforms: ['ios', 'android'],
    targetGroups: ['all'],
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2024-11-18T00:00:00Z',
  },
  beta_features: {
    key: 'beta_features',
    name: 'Funcionalidades Beta',
    description: 'Acesso antecipado a funcionalidades experimentais',
    enabled: false,
    rolloutPercentage: 0,
    platforms: ['ios', 'android'],
    targetGroups: ['beta'],
    createdAt: '2024-11-18T00:00:00Z',
    updatedAt: '2024-11-18T00:00:00Z',
  },
};

// Feature Flags Service
class FeatureFlagsService {
  private flags: Record<FeatureFlagKey, FeatureFlag> = { ...DEFAULT_FLAGS };
  private userGroups: string[] = ['all'];
  private initialized = false;

  // Initialize with remote config (from backend)
  async initialize(remoteFlags?: Partial<Record<FeatureFlagKey, FeatureFlag>>): Promise<void> {
    if (this.initialized) return;

    // Merge remote flags
    if (remoteFlags) {
      Object.entries(remoteFlags).forEach(([key, flag]) => {
        if (this.flags[key as FeatureFlagKey]) {
          this.flags[key as FeatureFlagKey] = { 
            ...this.flags[key as FeatureFlagKey], 
            ...flag,
            updatedAt: new Date().toISOString(),
          };
        }
      });
    }

    // Determine user groups
    await this.determineUserGroups();

    this.initialized = true;
    console.log('✅ Feature flags initialized');
  }

  // Determine which groups the current user belongs to
  private async determineUserGroups(): Promise<void> {
    const groups = ['all'];
    
    try {
      // Check if user is in beta program (from storage/backend)
      // This would come from user preferences or backend
      const isBeta = false; // await AsyncStorage.getItem('is_beta_user');
      if (isBeta) groups.push('beta');

      // Check if internal team
      const isInternal = __DEV__; // Simplified
      if (isInternal) groups.push('internal');

      // Check if driver (has driver profile)
      // const isDriver = await checkDriverProfile();
      // if (isDriver) groups.push('drivers');

      this.userGroups = groups;
    } catch (error) {
      console.warn('Failed to determine user groups:', error);
      this.userGroups = ['all'];
    }
  }

  // Check if a feature flag is enabled for current user
  isEnabled(key: FeatureFlagKey): boolean {
    const flag = this.flags[key];
    if (!flag) return false;

    // Check if flag is globally enabled
    if (!flag.enabled) return false;

    // Check expiration
    if (flag.expiresAt && new Date(flag.expiresAt) < new Date()) {
      return false;
    }

    // Check platform
    if (flag.platforms && !flag.platforms.includes(Platform.OS)) {
      return false;
    }

    // Check app version
    const appVersion = Constants.expoConfig?.version || '1.0.0';
    if (flag.minAppVersion && this.compareVersions(appVersion, flag.minAppVersion) < 0) {
      return false;
    }
    if (flag.maxAppVersion && this.compareVersions(appVersion, flag.maxAppVersion) > 0) {
      return false;
    }

    // Check target groups
    if (flag.targetGroups && flag.targetGroups.length > 0) {
      const hasGroup = flag.targetGroups.some(group => this.userGroups.includes(group));
      if (!hasGroup) return false;
    }

    // Check dependencies
    if (flag.dependencies && flag.dependencies.length > 0) {
      const allDepsEnabled = flag.dependencies.every(dep => this.isEnabled(dep));
      if (!allDepsEnabled) return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      // Deterministic rollout based on user ID
      const userId = this.getUserIdentifier();
      const hash = this.hashString(`${key}:${userId}`);
      const bucket = hash % 100;
      if (bucket >= flag.rolloutPercentage) {
        return false;
      }
    }

    return true;
  }

  // Get flag configuration
  getFlag(key: FeatureFlagKey): FeatureFlag | undefined {
    return this.flags[key];
  }

  // Get all flags
  getAllFlags(): Record<FeatureFlagKey, FeatureFlag> {
    return { ...this.flags };
  }

  // Get enabled flags for current user
  getEnabledFlags(): FeatureFlag[] {
    return Object.values(this.flags).filter(flag => this.isEnabled(flag.key));
  }

  // Update flag (from remote config)
  updateFlag(key: FeatureFlagKey, updates: Partial<FeatureFlag>): void {
    if (this.flags[key]) {
      this.flags[key] = { ...this.flags[key], ...updates, updatedAt: new Date().toISOString() };
    }
  }

  // Enable/disable flag
  setFlagEnabled(key: FeatureFlagKey, enabled: boolean): void {
    if (this.flags[key]) {
      this.flags[key].enabled = enabled;
      this.flags[key].updatedAt = new Date().toISOString();
    }
  }

  // Set rollout percentage
  setRollout(key: FeatureFlagKey, percentage: number): void {
    if (this.flags[key]) {
      this.flags[key].rolloutPercentage = Math.max(0, Math.min(100, percentage));
      this.flags[key].updatedAt = new Date().toISOString();
    }
  }

  // Helper: Compare semantic versions
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 !== p2) return p1 - p2;
    }
    return 0;
  }

  // Helper: Get user identifier for rollout bucketing
  private getUserIdentifier(): string {
    // In real app, get from secure storage or user context
    return 'user-' + (typeof window !== 'undefined' ? window.localStorage.getItem('user_id') : 'anonymous');
  }

  // Helper: Simple hash for deterministic bucketing
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Reset to defaults
  reset(): void {
    this.flags = { ...DEFAULT_FLAGS };
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagsService();

// React hook for feature flags
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  // In real implementation, use useSyncExternalStore or context
  return featureFlags.isEnabled(key);
}

export function useFeatureFlags(): FeatureFlagsService {
  return featureFlags;
}

// Feature flag wrapper component
export function withFeatureFlag<P extends object>(
  key: FeatureFlagKey,
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<P>
) {
  return function WithFeatureFlag(props: P) {
    const enabled = featureFlags.isEnabled(key);
    
    if (!enabled) {
      return fallback ? <fallback {...props} /> : null;
    }
    
    return <Component {...props} />;
  };
}

// Export default flags for reference
export { DEFAULT_FLAGS };
export type { FeatureFlag, FeatureFlagKey };