import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useAppStore } from '../store';
import { SyncOperation } from '../store';

// Configuração base
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.entregafacil.app';
const EVOLUTION_BASE_URL = process.env.EXPO_PUBLIC_EVOLUTION_URL || 'https://evolution.entregafacil.app';

class APIClient {
  private client: AxiosInstance;
  private evolutionClient: AxiosInstance;
  private isOnline: boolean = true;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly BATCH_SIZE = 10;
  private readonly SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutos

  constructor() {
    // Cliente principal (API EntregaFácil)
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Cliente Evolution API (WhatsApp)
    this.evolutionClient = axios.create({
      baseURL: EVOLUTION_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
    this.setupNetworkListener();
  }

  private setupInterceptors(): void {
    // Interceptor de request - adiciona token de auth
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = useAppStore.getState().token;
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        // Adiciona request ID para tracing
        config.headers['X-Request-ID'] = crypto.randomUUID();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor de response - trata 401, 403, erros de rede
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Erro de rede / timeout - enqueue para sync offline
        if (!error.response && (error.code === 'ECONNABORTED' || error.message === 'Network Error')) {
          if (originalRequest && !originalRequest._retry) {
            await this.enqueueFailedRequest(originalRequest);
          }
          return Promise.reject(error);
        }

        // 401 - Token expirado, tenta refresh
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await this.refreshToken();
            const token = useAppStore.getState().token;
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return this.client.request(originalRequest);
          } catch (refreshError) {
            useAppStore.getState().logout();
            return Promise.reject(refreshError);
          }
        }

        // 403 - Acesso negado
        if (error.response?.status === 403) {
          console.warn('[API] Acesso negado:', error.response.data);
        }

        // 5xx - Erro servidor, enqueue se for mutação
        if (error.response && error.response.status >= 500 && originalRequest) {
          const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(originalRequest.method?.toUpperCase() || '');
          if (isMutation && !originalRequest._retry) {
            await this.enqueueFailedRequest(originalRequest);
          }
        }

        return Promise.reject(error);
      }
    );

    // Evolution API interceptors
    this.evolutionClient.interceptors.request.use(
      (config) => {
        const apiKey = useAppStore.getState().whatsappConfig?.apiKey;
        if (apiKey && config.headers) {
          config.headers.apikey = apiKey;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isInternetReachable ?? false;

      useAppStore.getState().setIsOnline(this.isOnline);

      // Quando volta online, dispara sync
      if (!wasOnline && this.isOnline) {
        console.log('[API] Conexão restaurada, iniciando sync...');
        this.flushQueue();
      }
    });

    // Verifica estado inicial
    NetInfo.fetch().then((state) => {
      this.isOnline = state.isInternetReachable ?? false;
      useAppStore.getState().setIsOnline(this.isOnline);
    });
  }

  // ========== Métodos Públicos ==========

  // GET
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  // POST
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  // PUT
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  // PATCH
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  // DELETE
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // ========== Evolution API ==========

  async evolutionPost<T>(url: string, data?: any): Promise<T> {
    const response = await this.evolutionClient.post<T>(url, data);
    return response.data;
  }

  async evolutionGet<T>(url: string): Promise<T> {
    const response = await this.evolutionClient.get<T>(url);
    return response.data;
  }

  // ========== Auth ==========

  async login(email: string, password: string): Promise<{ user: any; token: string; refreshToken: string }> {
    const response = await this.client.post('/auth/login', { email, password });
    const { user, token, refreshToken } = response.data;
    useAppStore.getState().setAuth(user, token, refreshToken);
    return { user, token, refreshToken };
  }

  async register(data: { nome: string; email: string; password: string; telefone: string; cpf: string }): Promise<{ user: any; token: string; refreshToken: string }> {
    const response = await this.client.post('/auth/register', data);
    const { user, token, refreshToken } = response.data;
    useAppStore.getState().setAuth(user, token, refreshToken);
    return { user, token, refreshToken };
  }

  async refreshToken(): Promise<string> {
    const refreshToken = useAppStore.getState().refreshToken;
    if (!refreshToken) throw new Error('No refresh token');

    const response = await this.client.post('/auth/refresh', { refreshToken });
    const { token, refreshToken: newRefreshToken } = response.data;

    const user = useAppStore.getState().user;
    if (user) {
      useAppStore.getState().setAuth(user, token, newRefreshToken);
    }
    return token;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      useAppStore.getState().logout();
    }
  }

  async getProfile(): Promise<any> {
    return this.get('/auth/me');
  }

  // ========== Endereços ==========

  async getAddresses(): Promise<any[]> {
    return this.get('/addresses');
  }

  async createAddress(data: any): Promise<any> {
    return this.post('/addresses', data);
  }

  async updateAddress(id: string, data: any): Promise<any> {
    return this.put(`/addresses/${id}`, data);
  }

  async deleteAddress(id: string): Promise<void> {
    return this.delete(`/addresses/${id}`);
  }

  async geocodeAddress(query: string): Promise<any[]> {
    return this.get('/addresses/geocode', { params: { q: query } });
  }

  // ========== Rotas ==========

  async getRoutes(params?: { status?: string; page?: number; limit?: number }): Promise<any[]> {
    return this.get('/routes', { params });
  }

  async getRoute(id: string): Promise<any> {
    return this.get(`/routes/${id}`);
  }

  async createRoute(data: any): Promise<any> {
    return this.post('/routes', data);
  }

  async updateRoute(id: string, data: any): Promise<any> {
    return this.put(`/routes/${id}`, data);
  }

  async deleteRoute(id: string): Promise<void> {
    return this.delete(`/routes/${id}`);
  }

  async optimizeRoute(id: string): Promise<any> {
    return this.post(`/routes/${id}/optimize`);
  }

  async startRoute(id: string): Promise<any> {
    return this.post(`/routes/${id}/start`);
  }

  async finishRoute(id: string): Promise<any> {
    return this.post(`/routes/${id}/finish`);
  }

  // ========== Entregas/Comprovações ==========

  async createDelivery(data: any): Promise<any> {
    return this.post('/deliveries', data);
  }

  async getDeliveries(routeId: string): Promise<any[]> {
    return this.get(`/deliveries`, { params: { routeId } });
  }

  async uploadProof(fileUri: string, metadata: any): Promise<any> {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: 'image/jpeg',
      name: `proof_${Date.now()}.jpg`,
    } as any);
    formData.append('metadata', JSON.stringify(metadata));

    return this.client.post('/deliveries/proof', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  }

  async uploadSignature(base64: string): Promise<any> {
    const formData = new FormData();
    formData.append('base64', base64);
    formData.append('metadata', JSON.stringify({ timestamp: new Date().toISOString() }));

    return this.client.post('/deliveries/assinatura', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
  }

  // ========== WhatsApp ==========

  async testEvolutionConnection(instanceName: string): Promise<any> {
    return this.evolutionGet(`/instance/connectionState/${instanceName}`);
  }

  async pairEvolutionQR(instanceName: string): Promise<any> {
    return this.evolutionPost(`/instance/connect/${instanceName}`, {});
  }

  async sendWhatsAppMessage(instanceName: string, number: string, text: string): Promise<any> {
    return this.evolutionPost(`/message/sendText/${instanceName}`, {
      number,
      text,
      options: { delay: 1000, presence: 'composing', linkPreview: false },
    });
  }

  async getWhatsAppTemplates(instanceName: string): Promise<any> {
    return this.evolutionGet(`/settings/templates/${instanceName}`);
  }

  async updateWhatsAppTemplate(instanceName: string, templateName: string, content: string): Promise<any> {
    return this.evolutionPost(`/settings/templates/${instanceName}/${templateName}`, { content });
  }

  // ========== Relatórios ==========

  async exportRoutePDF(routeId: string): Promise<Blob> {
    const response = await this.client.get(`/reports/routes/${routeId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async exportRouteCSV(routeId: string): Promise<string> {
    const response = await this.client.get(`/reports/routes/${routeId}/csv`, {
      responseType: 'text',
    });
    return response.data;
  }

  async getDashboardStats(): Promise<any> {
    return this.get('/reports/dashboard');
  }

  // ========== Sync ==========

  async syncBatch(operations: SyncOperation[]): Promise<any> {
    return this.post('/sync/batch', { operations });
  }

  async getServerChanges(since: string): Promise<any> {
    return this.get('/sync/changes', { params: { since } });
  }

  // ========== Health ==========

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // ========== Offline Queue Management ==========

  private async enqueueFailedRequest(config: InternalAxiosRequestConfig): Promise<void> {
    const operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount' | 'status'> = {
      type: this.mapMethodToType(config.method || 'GET'),
      entity: this.extractEntityFromUrl(config.url || ''),
      payload: {
        url: config.url,
        method: config.method,
        data: config.data,
        params: config.params,
        headers: config.headers,
      },
    };

    useAppStore.getState().enqueue(operation);
    console.log('[API] Request enfileirado para sync offline:', config.url);
  }

  private mapMethodToType(method: string): SyncOperation['type'] {
    switch (method.toUpperCase()) {
      case 'POST': return 'create';
      case 'PUT':
      case 'PATCH': return 'update';
      case 'DELETE': return 'delete';
      default: return 'create';
    }
  }

  private extractEntityFromUrl(url: string): SyncOperation['entity'] {
    const match = url.match(/\/api\/v1\/(\w+)/);
    if (match) {
      const entity = match[1].replace(/s$/, ''); // routes -> route
      const entityMap: Record<string, SyncOperation['entity']> = {
        address: 'address',
        route: 'route',
        waypoint: 'waypoint',
        delivery: 'delivery',
        whatsapp_log: 'whatsapp_log',
        motorista: 'motorista',
        veiculo: 'veiculo',
      };
      return entityMap[entity] || 'address';
    }
    return 'address';
  }

  async flushQueue(): Promise<void> {
    if (useAppStore.getState().isSyncing) return;
    if (!this.isOnline) return;

    const pendingOps = useAppStore.getState().getPendingOperations();
    if (pendingOps.length === 0) return;

    useAppStore.getState().setIsSyncing(true);
    console.log(`[Sync] Iniciando flush de ${pendingOps.length} operações`);

    // Processa em batches
    for (let i = 0; i < pendingOps.length; i += this.BATCH_SIZE) {
      const batch = pendingOps.slice(i, i + this.BATCH_SIZE);

      // Marca como processing
      batch.forEach((op) => useAppStore.getState().updateQueueStatus(op.id, 'processing'));

      try {
        const result = await this.syncBatch(batch);

        // Marca como synced
        batch.forEach((op) => useAppStore.getState().updateQueueStatus(op.id, 'synced'));

        // Aplica server changes
        if (result.serverChanges?.length > 0) {
          await this.applyServerChanges(result.serverChanges);
        }

        // Atualiza lastSyncAt
        useAppStore.getState().setLastSyncAt(new Date().toISOString());

      } catch (error) {
        console.error('[Sync] Erro no batch:', error);
        batch.forEach((op) => {
          useAppStore.getState().incrementRetry(op.id);
          if (op.retryCount >= this.MAX_RETRIES) {
            useAppStore.getState().updateQueueStatus(op.id, 'error', (error as Error).message);
          } else {
            useAppStore.getState().updateQueueStatus(op.id, 'error', (error as Error).message);
          }
        });
      }
    }

    // Limpa operações sincronizadas
    useAppStore.getState().clearSynced();
    useAppStore.getState().setIsSyncing(false);
    console.log('[Sync] Flush concluído');
  }

  private async applyServerChanges(changes: any[]): Promise<void> {
    // Aplica mudanças do servidor no store local
    for (const change of changes) {
      const { entity, id, data, action } = change;
      const store = useAppStore.getState();

      switch (entity) {
        case 'route':
          if (action === 'delete') store.removeRoute(id);
          else if (action === 'update') store.updateRoute(id, data);
          else if (action === 'create') store.addRoute(data);
          break;
        case 'address':
          if (action === 'delete') store.removeAddress(id);
          else if (action === 'update') store.updateAddress(id, data);
          else if (action === 'create') store.addAddress(data);
          break;
      }
    }
  }

  // Inicia sync periódico
  startPeriodicSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.flushQueue();
      }
    }, this.SYNC_INTERVAL_MS);

    console.log('[Sync] Sync periódico iniciado (15min)');
  }

  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[Sync] Sync periódico parado');
    }
  }

  // Force sync manual
  async forceSync(): Promise<void> {
    await this.flushQueue();
  }
}

// Singleton
export const apiClient = new APIClient();

// Hook para usar em componentes
export const useAPI = () => apiClient;

// Inicializa sync periódico ao importar
if (typeof window !== 'undefined' || typeof global !== 'undefined') {
  apiClient.startPeriodicSync();
}

export default apiClient;