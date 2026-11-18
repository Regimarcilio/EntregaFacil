import { useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { apiClient } from '../api/client';

export interface WhatsAppTemplate {
  name: string;
  content: string;
  variables?: string[];
}

export function useWhatsApp() {
  const { whatsappConfig, user } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'conectado' | 'desconectado' | 'pareando' | 'desconhecido'>('desconhecido');
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const testConnection = useCallback(async (instanceName: string) => {
    setLoading(true);
    try {
      const result = await apiClient.testEvolutionConnection(instanceName);
      const status = result?.state === 'open' ? 'conectado' : 
                     result?.state === 'connecting' ? 'pareando' : 'desconectado';
      setConnectionStatus(status);
      setLastSync(new Date().toISOString());
      
      // Atualiza store
      if (whatsappConfig) {
        useAppStore.getState().setWhatsAppConfig({
          ...whatsappConfig,
          statusConexao: status,
        });
      }
      return result;
    } catch (error) {
      setConnectionStatus('desconectado');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [whatsappConfig]);

  const pairQR = useCallback(async (instanceName: string) => {
    setLoading(true);
    try {
      const result = await apiClient.pairEvolutionQR(instanceName);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTemplates = useCallback(async (instanceName: string) => {
    setLoading(true);
    try {
      const data = await apiClient.getWhatsAppTemplates(instanceName);
      // Normaliza resposta da Evolution API
      const normalized = Array.isArray(data) ? data : (data?.templates || []);
      const templates = normalized.map((t: any) => ({
        name: t.name || t.id,
        content: t.content || t.body || '',
        variables: t.variables || [],
      }));
      setTemplates(templates);
      
      // Atualiza template padrão se não definido
      if (templates.length > 0 && whatsappConfig && !whatsappConfig.templatePadrao) {
        useAppStore.getState().setWhatsAppConfig({
          ...whatsappConfig,
          templatePadrao: templates[0].name,
        });
      }
      return templates;
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setTemplates([]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [whatsappConfig]);

  const updateTemplate = useCallback(async (instanceName: string, templateName: string, content: string) => {
    setLoading(true);
    try {
      const result = await apiClient.updateWhatsAppTemplate(instanceName, templateName, content);
      
      // Atualiza local
      setTemplates(prev => prev.map(t => 
        t.name === templateName ? { ...t, content } : t
      ));
      
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTestMessage = useCallback(async (instanceName: string, number: string, templateName: string) => {
    setLoading(true);
    try {
      const template = templates.find(t => t.name === templateName);
      const text = template?.content || 'Mensagem de teste do EntregaFácil';
      
      const result = await apiClient.sendWhatsAppMessage(instanceName, number, text);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [templates]);

  const sendDeliveryNotification = useCallback(async (
    instanceName: string,
    number: string,
    templateName: string,
    variables: Record<string, string>
  ) => {
    setLoading(true);
    try {
      const template = templates.find(t => t.name === templateName);
      if (!template) throw new Error('Template não encontrado');
      
      // Substitui variáveis no template
      let text = template.content;
      Object.entries(variables).forEach(([key, value]) => {
        text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      });
      
      const result = await apiClient.sendWhatsAppMessage(instanceName, number, text);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [templates]);

  return {
    // State
    loading,
    connectionStatus,
    templates,
    lastSync,
    
    // Actions
    testConnection,
    pairQR,
    getTemplates,
    updateTemplate,
    sendTestMessage,
    sendDeliveryNotification,
  };
}