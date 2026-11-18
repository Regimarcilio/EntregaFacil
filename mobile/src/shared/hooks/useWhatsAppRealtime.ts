import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { apiClient } from '../api/client';

interface WhatsAppStatusUpdate {
  messageId: string;
  status: 'enviado' | 'entregue' | 'lido' | 'erro';
  entregueEm?: string;
  lidoEm?: string;
  erro?: string;
}

interface WhatsAppConnectionUpdate {
  instanceName: string;
  status: 'conectado' | 'desconectado' | 'pareando';
}

type WhatsAppEventCallback = (event: WhatsAppStatusUpdate | WhatsAppConnectionUpdate) => void;

export function useWhatsAppRealtime(instanceName?: string) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WhatsAppStatusUpdate | WhatsAppConnectionUpdate | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { whatsappConfig, user } = useAppStore();

  // Polling-based approach (mais simples e confiável para mobile)
  const startPolling = useCallback((callback: WhatsAppEventCallback, intervalMs = 10000) => {
    if (intervalRef.current) return;

    const poll = async () => {
      if (!instanceName || !whatsappConfig?.apiKey) return;

      try {
        // Verifica status da conexão
        const connResult = await apiClient.testEvolutionConnection(instanceName);
        const status = connResult?.state === 'open' ? 'conectado' : 
                       connResult?.state === 'connecting' ? 'pareando' : 'desconectado';
        
        if (status !== (whatsappConfig.statusConexao as any)) {
          callback({ instanceName, status });
        }

        // Busca logs recentes para verificar status de mensagens
        // Nota: Em produção, usar endpoint dedicado /whatsapp/status/:messageId
        // ou WebSocket para tempo real real
      } catch (error) {
        console.error('WhatsApp polling error:', error);
      }
    };

    // Poll inicial
    poll();
    
    // Intervalo
    intervalRef.current = setInterval(poll, intervalMs);
    setConnected(true);
  }, [instanceName, whatsappConfig]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setConnected(false);
    }
  }, []);

  // WebSocket approach (opcional - requer backend WebSocket server)
  const connectWebSocket = useCallback((callback: WhatsAppEventCallback) => {
    if (!instanceName || wsRef.current) return;

    try {
      const wsUrl = `${process.env.EXPO_PUBLIC_WS_URL || 'wss://api.entregafacil.app'}/ws/whatsapp?instance=${instanceName}&token=${whatsappConfig?.apiKey}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[WhatsApp WS] Connected');
        setConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message_status') {
            callback({
              messageId: data.messageId,
              status: data.status,
              entregueEm: data.entregueEm,
              lidoEm: data.lidoEm,
              erro: data.erro,
            });
          } else if (data.type === 'connection_status') {
            callback({
              instanceName: data.instanceName,
              status: data.status,
            });
          }
        } catch (error) {
          console.error('[WhatsApp WS] Parse error:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[WhatsApp WS] Error:', error);
      };

      wsRef.current.onclose = () => {
        console.log('[WhatsApp WS] Disconnected');
        setConnected(false);
        wsRef.current = null;
        
        // Reconnect after 5 seconds
        setTimeout(() => connectWebSocket(callback), 5000);
      };
    } catch (error) {
      console.error('[WhatsApp WS] Connection failed:', error);
    }
  }, [instanceName, whatsappConfig]);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setConnected(false);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stopPolling();
      disconnectWebSocket();
    };
  }, [stopPolling, disconnectWebSocket]);

  return {
    connected,
    lastEvent,
    startPolling,
    stopPolling,
    connectWebSocket,
    disconnectWebSocket,
  };
}

/**
 * Hook específico para monitorar status de uma mensagem específica
 */
export function useWhatsAppMessageStatus(messageId: string | null) {
  const [status, setStatus] = useState<'enviado' | 'entregue' | 'lido' | 'erro' | 'desconhecido'>('desconhecido');
  const [entregueEm, setEntregueEm] = useState<string | null>(null);
  const [lidoEm, setLidoEm] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { whatsappConfig } = useAppStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!messageId || !whatsappConfig?.apiKey) return;

    const checkStatus = async () => {
      try {
        // Em produção, usar endpoint dedicado
        // const result = await apiClient.client.get(`/whatsapp/status/${messageId}`);
        // Por enquanto, busca nos logs
        const logs = await apiClient.client.get('/whatsapp/logs', {
          params: { limit: 100 }
        });
        
        const log = logs.data?.find((l: any) => l.messageId === messageId);
        if (log) {
          setStatus(log.status);
          setEntregueEm(log.entregueEm);
          setLidoEm(log.lidoEm);
          setErro(log.erro);
        }
      } catch (error) {
        console.error('Failed to check message status:', error);
      }
    };

    checkStatus();
    intervalRef.current = setInterval(checkStatus, 5000); // Poll every 5s

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [messageId, whatsappConfig]);

  return { status, entregueEm, lidoEm, erro };
}

/**
 * Hook para receber atualizações de conexão WhatsApp em tempo real
 * Usa o sync mechanism existente + polling de fallback
 */
export function useWhatsAppConnectionStatus(instanceName?: string) {
  const [status, setStatus] = useState<'conectado' | 'desconectado' | 'pareando' | 'desconhecido'>('desconhecido');
  const { whatsappConfig } = useAppStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!instanceName || !whatsappConfig?.apiKey) return;

    const checkConnection = async () => {
      try {
        const result = await apiClient.testEvolutionConnection(instanceName);
        const newStatus = result?.state === 'open' ? 'conectado' : 
                          result?.state === 'connecting' ? 'pareando' : 'desconectado';
        setStatus(newStatus);
        
        // Atualiza store se mudou
        if (whatsappConfig && newStatus !== whatsappConfig.statusConexao) {
          useAppStore.getState().setWhatsAppConfig({
            ...whatsappConfig,
            statusConexao: newStatus,
          });
        }
      } catch (error) {
        setStatus('desconectado');
      }
    };

    checkConnection();
    intervalRef.current = setInterval(checkConnection, 15000); // Check every 15s

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [instanceName, whatsappConfig]);

  return status;
}