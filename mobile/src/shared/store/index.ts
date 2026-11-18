import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface Motorista {
  id: string;
  nome: string;
  cpfHash: string;
  telefone: string;
  email: string;
  fotoUrl?: string;
  veiculo?: Veiculo;
  preferencias: Preferencias;
  whatsappConfig?: WhatsAppConfig;
  createdAt: string;
  updatedAt: string;
}

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  cor: string;
  ano: number;
  tipo: 'moto' | 'carro' | 'bike';
  crlvUrl?: string;
}

export interface Preferencias {
  tema: 'claro' | 'escuro' | 'sistema';
  unidades: 'metric' | 'imperial';
  vozNavegacao: boolean;
  volumeVoz: number;
  modoLuva: boolean;
  autoIniciarNavegacao: boolean;
  syncApenasWifi: boolean;
  notificacoesPush: boolean;
}

export interface WhatsAppConfig {
  evolutionUrl: string;
  apiKey: string;
  instanceName: string;
  remetente: 'motorista' | 'destinatario';
  templatePadrao: string;
  statusConexao: 'conectado' | 'desconectado' | 'pareando';
}

export interface Endereco {
  id: string;
  motoristaId: string;
  nome: string;
  enderecoFormatado: string;
  latitude: number;
  longitude: number;
  cep?: string;
  bairro?: string;
  cidade: string;
  estado: string;
  observacoes?: string;
  destinatario?: Destinatario;
  createdAt: string;
  updatedAt: string;
}

export interface Destinatario {
  nome: string;
  telefone: string;
  notificar: 'sempre' | 'nunca' | 'apenas_problema';
}

export interface Rota {
  id: string;
  motoristaId: string;
  veiculoId: string;
  nome: string;
  data: string;
  status: 'rascunho' | 'otimizada' | 'em_andamento' | 'concluida' | 'parcial' | 'cancelada';
  waypoints: Waypoint[];
  geometry?: GeoJSON.LineString;
  metricas?: MetricasRota;
  createdAt: string;
  updatedAt: string;
}

export interface Waypoint {
  id: string;
  rotaId: string;
  enderecoId: string;
  ordem: number;
  status: 'pendente' | 'em_rota' | 'entregue' | 'problema' | 'cancelada';
  comprovacao?: Comprovacao;
  whatsappLog?: WhatsAppLog;
}

export interface Comprovacao {
  id: string;
  waypointId: string;
  fotoUrl: string;
  fotoHash: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  assinaturaUrl?: string;
  observacao?: string;
  tipoProblema?: 'cliente_ausente' | 'endereco_errado' | 'recusou' | 'outro';
}

export interface WhatsAppLog {
  id: string;
  waypointId: string;
  messageId: string;
  destinatarioNome: string;
  telefone: string;
  templateUsado: string;
  status: 'enviado' | 'entregue' | 'lido' | 'erro';
  enviadoEm: string;
  entregueEm?: string;
  lidoEm?: string;
  erro?: string;
}

export interface MetricasRota {
  distanciaTotalKm: number;
  tempoEstimadoMin: number;
  tempoRealMin?: number;
  entregues: number;
  problemas: number;
  canceladas: number;
  ganhoEstimado: number;
  economiaVsManual: number;
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'address' | 'route' | 'waypoint' | 'delivery' | 'whatsapp_log' | 'motorista' | 'veiculo';
  payload: Record<string, any>;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'processing' | 'synced' | 'error' | 'conflict';
  serverTimestamp?: number;
  error?: string;
}

const defaultPreferencias: Preferencias = {
  tema: 'sistema',
  unidades: 'metric',
  vozNavegacao: true,
  volumeVoz: 80,
  modoLuva: false,
  autoIniciarNavegacao: true,
  syncApenasWifi: true,
  notificacoesPush: true,
};

interface AppState {
  // Auth
  user: Motorista | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: Motorista, token: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (data: Partial<Motorista>) => void;

  // Rotas
  routes: Rota[];
  currentRouteId: string | null;
  setRoutes: (routes: Rota[]) => void;
  addRoute: (route: Rota) => void;
  updateRoute: (id: string, data: Partial<Rota>) => void;
  removeRoute: (id: string) => void;
  setCurrentRoute: (id: string | null) => void;
  getCurrentRoute: () => Rota | undefined;

  // Endereços
  addresses: Endereco[];
  setAddresses: (addresses: Endereco[]) => void;
  addAddress: (address: Endereco) => void;
  updateAddress: (id: string, data: Partial<Endereco>) => void;
  removeAddress: (id: string) => void;

  // Sync Queue
  syncQueue: SyncOperation[];
  enqueue: (op: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>) => string;
  dequeue: (id: string) => void;
  updateQueueStatus: (id: string, status: SyncOperation['status'], error?: string) => void;
  incrementRetry: (id: string) => void;
  getPendingOperations: () => SyncOperation[];
  clearSynced: () => void;

  // Preferences
  preferences: Preferencias;
  setPreferences: (prefs: Partial<Preferencias>) => void;

  // WhatsApp Config
  whatsappConfig: WhatsAppConfig | null;
  setWhatsAppConfig: (config: WhatsAppConfig | null) => void;

  // UI State
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  isSyncing: boolean;
  setIsSyncing: (syncing: boolean) => void;
  lastSyncAt: string | null;
  setLastSyncAt: (date: string) => void;

  // Navigation
  navigationState: 'idle' | 'navigating' | 'driving_mode';
  setNavigationState: (state: 'idle' | 'navigating' | 'driving_mode') => void;
}

const storage: StateStorage = {
  getItem: async (name) => {
    try {
      const value = await AsyncStorage.getItem(name);
      return value ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (e) {
      console.error('Zustand persist error:', e);
    }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (e) {
      console.error('Zustand persist error:', e);
    }
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, token, refreshToken) =>
        set({ user, token, refreshToken, isAuthenticated: true }),
      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          routes: [],
          addresses: [],
          syncQueue: [],
          whatsappConfig: null,
          currentRouteId: null,
        }),
      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data, updatedAt: new Date().toISOString() } : null,
        })),

      // Rotas
      routes: [],
      currentRouteId: null,
      setRoutes: (routes) => set({ routes }),
      addRoute: (route) =>
        set((state) => ({ routes: [route, ...state.routes] })),
      updateRoute: (id, data) =>
        set((state) => ({
          routes: state.routes.map((r) =>
            r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r
          ),
        })),
      removeRoute: (id) =>
        set((state) => ({
          routes: state.routes.filter((r) => r.id !== id),
          currentRouteId: state.currentRouteId === id ? null : state.currentRouteId,
        })),
      setCurrentRoute: (id) => set({ currentRouteId: id }),
      getCurrentRoute: () => {
        const { routes, currentRouteId } = get();
        return routes.find((r) => r.id === currentRouteId);
      },

      // Endereços
      addresses: [],
      setAddresses: (addresses) => set({ addresses }),
      addAddress: (address) =>
        set((state) => ({ addresses: [address, ...state.addresses] })),
      updateAddress: (id, data) =>
        set((state) => ({
          addresses: state.addresses.map((a) =>
            a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a
          ),
        })),
      removeAddress: (id) =>
        set((state) => ({
          addresses: state.addresses.filter((a) => a.id !== id),
        })),

      // Sync Queue
      syncQueue: [],
      enqueue: (op) => {
        const id = uuidv4();
        const operation: SyncOperation = {
          ...op,
          id,
          timestamp: Date.now(),
          retryCount: 0,
          status: 'pending',
        };
        set((state) => ({ syncQueue: [...state.syncQueue, operation] }));
        return id;
      },
      dequeue: (id) =>
        set((state) => ({
          syncQueue: state.syncQueue.filter((op) => op.id !== id),
        })),
      updateQueueStatus: (id, status, error) =>
        set((state) => ({
          syncQueue: state.syncQueue.map((op) =>
            op.id === id ? { ...op, status, error: error ?? op.error } : op
          ),
        })),
      incrementRetry: (id) =>
        set((state) => ({
          syncQueue: state.syncQueue.map((op) =>
            op.id === id ? { ...op, retryCount: op.retryCount + 1 } : op
          ),
        })),
      getPendingOperations: () => {
        const { syncQueue } = get();
        return syncQueue.filter((op) => op.status === 'pending' || op.status === 'error');
      },
      clearSynced: () =>
        set((state) => ({
          syncQueue: state.syncQueue.filter((op) => op.status !== 'synced'),
        })),

      // Preferences
      preferences: defaultPreferencias,
      setPreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),

      // WhatsApp Config
      whatsappConfig: null,
      setWhatsAppConfig: (config) => set({ whatsappConfig: config }),

      // UI State
      isOnline: true,
      setIsOnline: (online) => set({ isOnline: online }),
      isSyncing: false,
      setIsSyncing: (syncing) => set({ isSyncing: syncing }),
      lastSyncAt: null,
      setLastSyncAt: (date) => set({ lastSyncAt: date }),

      // Navigation
      navigationState: 'idle',
      setNavigationState: (state) => set({ navigationState: state }),
    }),
    {
      name: 'entregafacil-storage',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        preferences: state.preferences,
        whatsappConfig: state.whatsappConfig,
        lastSyncAt: state.lastSyncAt,
        // Não persistir: routes, addresses, syncQueue (vêm do server)
      }),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migração v0 -> v1
          return {
            ...persistedState,
            preferences: { ...defaultPreferencias, ...persistedState.preferences },
          };
        }
        return persistedState;
      },
    }
  )
);

// Selectors para performance
export const selectAuth = (state: AppState) => ({
  user: state.user,
  token: state.token,
  isAuthenticated: state.isAuthenticated,
});

export const selectCurrentRoute = (state: AppState) => {
  if (!state.currentRouteId) return undefined;
  return state.routes.find((r) => r.id === state.currentRouteId);
};

export const selectPendingSync = (state: AppState) =>
  state.syncQueue.filter((op) => op.status === 'pending' || op.status === 'error').length;

export const selectIsOnline = (state: AppState) => state.isOnline;
export const selectIsSyncing = (state: AppState) => state.isSyncing;
export const selectNavigationState = (state: AppState) => state.navigationState;