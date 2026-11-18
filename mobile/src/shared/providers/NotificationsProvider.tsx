'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications, setupNotificationChannels, setupNotificationListeners, handleNotificationReceived, handleNotificationResponse } from '../services/notifications';
import { useAppStore } from '../store';

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, token, preferences, isOnline, setIsOnline } = useAppStore();

  // Configura canais no mount (Android)
  useEffect(() => {
    setupNotificationChannels();
  }, []);

  // Registra push token quando autenticado
  useEffect(() => {
    let mounted = true;

    const registerToken = async () => {
      if (isAuthenticated && token && preferences.notificacoesPush) {
        const pushToken = await registerForPushNotifications();
        if (pushToken && mounted) {
          console.log('✅ Push token registered:', pushToken.token.substring(0, 20) + '...');
        }
      }
    };

    registerToken();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, token, preferences.notificacoesPush]);

  // Configura listeners de notificação
  useEffect(() => {
    const cleanup = setupNotificationListeners(
      (notification) => handleNotificationReceived(notification),
      (response) => handleNotificationResponseWithNavigation(response, router)
    );

    return cleanup;
  }, [router]);

  // Notifica mudança de conectividade
  useEffect(() => {
    if (isOnline) {
      // App voltou online - sync em background
      const { syncQueue } = useAppStore.getState();
      const pendingOps = syncQueue.filter(op => op.status === 'pending' || op.status === 'error');
      
      if (pendingOps.length > 0 && preferences.notificacoesPush) {
        // Notifica que sync vai começar
        // (o sync real é feito pelo apiClient)
      }
    }
  }, [isOnline, preferences.notificacoesPush]);

  return <>{children}</>;
}

/**
 * Handler de resposta com navegação
 */
function handleNotificationResponseWithNavigation(
  response: Notifications.NotificationResponse,
  router: ReturnType<typeof useRouter>
): void {
  const { data } = response.notification.request.content;
  
  console.log('👆 Notification tapped:', data);

  // Navega baseado no tipo de notificação
  switch (data.type) {
    case 'route_reminder':
      if (data.routeId) {
        router.push(`/route/${data.routeId}/checklist`);
      }
      break;

    case 'delivery':
      if (data.routeId && data.waypointId) {
        router.push(`/route/${data.routeId}/proof/${data.waypointId}`);
      } else if (data.routeId) {
        router.push(`/route/${data.routeId}/checklist`);
      }
      break;

    case 'whatsapp_status':
      router.push('/settings/whatsapp');
      break;

    case 'sync':
      // Força sync - o apiClient já faz isso automaticamente
      // Podemos abrir a tela de configurações ou mostrar toast
      break;

    default:
      // Navegação padrão para home
      router.push('/');
  }
}

/**
 * Hook para usar notificações em componentes
 */
export function useNotifications() {
  const { preferences } = useAppStore();

  const notifySyncComplete = useCallback(async (success: boolean, details?: string) => {
    if (!preferences.notificacoesPush) return;
    const { notifySyncComplete: notify } = await import('../services/notifications');
    await notify(success, details);
  }, [preferences.notificacoesPush]);

  const notifyRouteReminder = useCallback(async (routeName: string, routeDate: Date, routeId: string) => {
    if (!preferences.notificacoesPush) return;
    const { notifyRouteReminder: notify } = await import('../services/notifications');
    await notify(routeName, routeDate, routeId);
  }, [preferences.notificacoesPush]);

  const notifyWhatsAppStatus = useCallback(async (status: 'connected' | 'disconnected' | 'pairing', instanceName?: string) => {
    if (!preferences.notificacoesPush) return;
    const { notifyWhatsAppStatus: notify } = await import('../services/notifications');
    await notify(status, instanceName);
  }, [preferences.notificacoesPush]);

  const notifyDeliveryConfirmed = useCallback(async (waypointName: string, routeId: string, waypointId: string) => {
    if (!preferences.notificacoesPush) return;
    const { notifyDeliveryConfirmed: notify } = await import('../services/notifications');
    await notify(waypointName, routeId, waypointId);
  }, [preferences.notificacoesPush]);

  const notifyDeliveryProblem = useCallback(async (waypointName: string, problemType: string, routeId: string, waypointId: string) => {
    if (!preferences.notificacoesPush) return;
    const { notifyDeliveryProblem: notify } = await import('../services/notifications');
    await notify(waypointName, problemType, routeId, waypointId);
  }, [preferences.notificacoesPush]);

  const scheduleBackgroundSync = useCallback(async () => {
    if (!preferences.notificacoesPush) return;
    const { scheduleBackgroundSyncNotification } = await import('../services/notifications');
    await scheduleBackgroundSyncNotification();
  }, [preferences.notificacoesPush]);

  const cancelAll = useCallback(async () => {
    const { cancelAllNotifications } = await import('../services/notifications');
    await cancelAllNotifications();
  }, []);

  return {
    notifySyncComplete,
    notifyRouteReminder,
    notifyWhatsAppStatus,
    notifyDeliveryConfirmed,
    notifyDeliveryProblem,
    scheduleBackgroundSync,
    cancelAll,
  };
}

export default NotificationsProvider;