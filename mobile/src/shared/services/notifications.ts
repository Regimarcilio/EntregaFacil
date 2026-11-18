import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useAppStore } from '../store';
import { apiClient } from '../api/client';

// Configuração padrão de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type: 'sync' | 'route_reminder' | 'whatsapp_status' | 'delivery' | 'system';
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: boolean;
  priority?: 'default' | 'high' | 'max';
  channelId?: string;
}

export interface PushToken {
  token: string;
  platform: 'ios' | 'android';
  deviceId?: string;
}

/**
 * Registra dispositivo para push notifications
 */
export async function registerForPushNotifications(): Promise<PushToken | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: false,
      },
      android: {
        channelIds: [
          'default',
          'sync',
          'route_reminders',
          'whatsapp_status',
          'deliveries',
        ],
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    });

    const token: PushToken = {
      token: tokenData.data,
      platform: Platform.OS as 'ios' | 'android',
      deviceId: Device.deviceId,
    };

    // Enviar token para o backend
    await sendTokenToBackend(token);

    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Envia token para o backend
 */
async function sendTokenToBackend(token: PushToken): Promise<void> {
  try {
    const state = useAppStore.getState();
    if (!state.token) return;

    await apiClient.client.post('/notifications/token', {
      token: token.token,
      platform: token.platform,
      deviceId: token.deviceId,
    });
  } catch (error) {
    console.error('Failed to send push token to backend:', error);
  }
}

/**
 * Configura canais de notificação (Android)
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Padrão',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0066CC',
  });

  await Notifications.setNotificationChannelAsync('sync', {
    name: 'Sincronização',
    importance: Notifications.AndroidImportance.LOW,
    vibrationPattern: [0, 100, 100, 100],
    lightColor: '#059669',
    description: 'Notificações de sincronização em background',
  });

  await Notifications.setNotificationChannelAsync('route_reminders', {
    name: 'Lembretes de Rota',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#F59E0B',
    description: 'Lembretes para iniciar rotas agendadas',
  });

  await Notifications.setNotificationChannelAsync('whatsapp_status', {
    name: 'Status WhatsApp',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#25D366',
    description: 'Atualizações de status de mensagens WhatsApp',
  });

  await Notifications.setNotificationChannelAsync('deliveries', {
    name: 'Entregas',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#0066CC',
    description: 'Notificações de entrega confirmada ou problema',
  });
}

/**
 * Agenda notificação local
 */
export async function scheduleLocalNotification(
  notification: NotificationData,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  const channelId = getChannelId(notification.type);

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      sound: notification.sound !== false,
      priority: notification.priority || 'default',
      ...(Platform.OS === 'android' && { channelId }),
    },
    trigger: trigger || null, // null = imediato
  });

  return identifier;
}

/**
 * Cancela notificação agendada
 */
export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

/**
 * Cancela todas notificações agendadas
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Obtém ID do canal baseado no tipo
 */
function getChannelId(type: NotificationData['type']): string {
  switch (type) {
    case 'sync': return 'sync';
    case 'route_reminder': return 'route_reminders';
    case 'whatsapp_status': return 'whatsapp_status';
    case 'delivery': return 'deliveries';
    default: return 'default';
  }
}

/**
 * Notificações específicas do app
 */

// Notificação de sync concluído
export async function notifySyncComplete(success: boolean, details?: string): Promise<void> {
  const prefs = useAppStore.getState().preferences;
  if (!preferences?.notificacoesPush) return;

  await scheduleLocalNotification({
    type: 'sync',
    title: success ? 'Sincronização Concluída' : 'Falha na Sincronização',
    body: success 
      ? 'Dados sincronizados com sucesso' 
      : `Erro: ${details || 'Tente novamente'}`,
    data: { type: 'sync', success },
    priority: 'default',
  });
}

// Lembrete de rota agendada
export async function notifyRouteReminder(routeName: string, routeDate: Date, routeId: string): Promise<void> {
  const prefs = useAppStore.getState().preferences;
  if (!preferences?.notificacoesPush) return;

  const now = new Date();
  const timeDiff = routeDate.getTime() - now.getTime();
  
  // Notificar 30 min antes
  const remindAt = new Date(routeDate.getTime() - 30 * 60 * 1000);
  
  if (remindAt > now) {
    await scheduleLocalNotification({
      type: 'route_reminder',
      title: 'Rota Agendada em Breve',
      body: `"${routeName}" começa em 30 minutos`,
      data: { type: 'route_reminder', routeId },
      priority: 'high',
      sound: true,
    }, {
      type: 'date',
      date: remindAt,
    } as Notifications.DateTriggerInput);
  }
}

// Status WhatsApp
export async function notifyWhatsAppStatus(status: 'connected' | 'disconnected' | 'pairing', instanceName?: string): Promise<void> {
  const prefs = useAppStore.getState().preferences;
  if (!preferences?.notificacoesPush) return;

  const messages = {
    connected: 'WhatsApp conectado e pronto para uso',
    disconnected: 'WhatsApp desconectado. Reconectando...',
    pairing: 'Escaneie o QR Code para parear',
  };

  await scheduleLocalNotification({
    type: 'whatsapp_status',
    title: 'Status WhatsApp',
    body: messages[status],
    data: { type: 'whatsapp_status', status, instanceName },
    priority: status === 'disconnected' ? 'high' : 'default',
  });
}

// Entrega confirmada
export async function notifyDeliveryConfirmed(waypointName: string, routeId: string, waypointId: string): Promise<void> {
  const prefs = useAppStore.getState().preferences;
  if (!preferences?.notificacoesPush) return;

  await scheduleLocalNotification({
    type: 'delivery',
    title: 'Entrega Confirmada',
    body: `Entrega em "${waypointName}" concluída com sucesso`,
    data: { type: 'delivery', routeId, waypointId, status: 'confirmed' },
    priority: 'high',
    sound: true,
  });
}

// Problema na entrega
export async function notifyDeliveryProblem(waypointName: string, problemType: string, routeId: string, waypointId: string): Promise<void> {
  const prefs = useAppStore.getState().preferences;
  if (!preferences?.notificacoesPush) return;

  const typeLabels: Record<string, string> = {
    cliente_ausente: 'Cliente Ausente',
    endereco_errado: 'Endereço Errado',
    recusou: 'Recusou Recebimento',
    outro: 'Problema',
  };

  await scheduleLocalNotification({
    type: 'delivery',
    title: 'Problema na Entrega',
    body: `${typeLabels[problemType] || 'Problema'} em "${waypointName}"`,
    data: { type: 'delivery', routeId, waypointId, status: 'problem', problemType },
    priority: 'high',
    sound: true,
  });
}

/**
 * Listeners para notificações recebidas
 */

let notificationListener: Notifications.Subscription | null = null;
let responseListener: Notifications.Subscription | null = null;

/**
 * Configura listeners de notificação
 */
export function setupNotificationListeners(
  onNotification: (notification: Notifications.Notification) => void,
  onResponse: (response: Notifications.NotificationResponse) => void
): () => void {
  // Notificação recebida com app em foreground
  notificationListener = Notifications.addNotificationReceivedListener(onNotification);

  // Usuário interagiu com notificação
  responseListener = Notifications.addNotificationResponseReceivedListener(onResponse);

  // Cleanup function
  return () => {
    if (notificationListener) {
      notificationListener.remove();
      notificationListener = null;
    }
    if (responseListener) {
      responseListener.remove();
      responseListener = null;
    }
  };
}

/**
 * Handler padrão para notificações recebidas
 */
export function handleNotificationReceived(notification: Notifications.Notification): void {
  const { data } = notification.request.content;
  
  console.log('📱 Notification received:', data);
  
  // Atualiza badge count
  Notifications.setBadgeCountAsync(
    (await Notifications.getBadgeCountAsync()) + 1
  );
}

/**
 * Handler padrão para resposta do usuário
 */
export function handleNotificationResponse(response: Notifications.NotificationResponse): void {
  const { data } = response.notification.request.content;
  
  console.log('👆 Notification response:', data);
  
  // Navega baseado no tipo
  switch (data.type) {
    case 'route_reminder':
      // Navegar para rota
      break;
    case 'delivery':
      // Navegar para detalhes da entrega
      break;
    case 'whatsapp_status':
      // Abrir config WhatsApp
      break;
    case 'sync':
      // Forçar sync
      break;
  }
}

/**
 * Badge management
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function incrementBadgeCount(): Promise<void> {
  const current = await Notifications.getBadgeCountAsync();
  await Notifications.setBadgeCountAsync(current + 1);
}

export async function clearBadgeCount(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Background sync notification (para Headless JS / TaskManager)
 */
export async function scheduleBackgroundSyncNotification(): Promise<void> {
  const prefs = useAppStore.getState().preferences;
  if (!preferences?.notificacoesPush) return;

  // Agenda para daqui a 15 min se houver itens pendentes
  const pendingOps = useAppStore.getState().getPendingOperations();
  if (pendingOps.length > 0) {
    await scheduleLocalNotification({
      type: 'sync',
      title: 'Sincronização Pendente',
      body: `${pendingOps.length} operação(ões) aguardando conexão`,
      data: { type: 'sync', pending: pendingOps.length },
      priority: 'low',
      sound: false,
    }, {
      type: 'timeInterval',
      seconds: 15 * 60, // 15 min
      repeats: true,
    } as Notifications.TimeIntervalTriggerInput);
  }
}

export { Notifications };