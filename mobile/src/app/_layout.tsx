import { Stack } from 'expo-router';
import { Providers } from '@/shared/providers';
import { useAppStore } from '@/shared/store';
import { useEffect } from 'react';
import { apiClient } from '@/shared/api/client';

export default function RootLayout() {
  const { isAuthenticated, token, refreshToken, user, setAuth, logout } = useAppStore();

  // Inicializa auth do store
  useEffect(() => {
    const initAuth = async () => {
      // apiClient.startPeriodicSync() já é chamado no import
    };
    initAuth();
  }, []);

  return (
    <Providers>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </Providers>
  );
}