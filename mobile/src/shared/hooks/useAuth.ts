import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { useAppStore } from '../store';
import { apiClient } from '../api/client';

export function useAuth() {
  const { setAuth, logout, user, token, isAuthenticated } = useAppStore();
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiClient.login(email, password);
      setAuth(response.user, response.token, response.refreshToken);
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  }, [setAuth]);

  const register = useCallback(async (data: {
    nome: string;
    email: string;
    password: string;
    telefone: string;
    cpf: string;
    veiculo?: any;
  }) => {
    setLoading(true);
    try {
      const response = await apiClient.register(data);
      setAuth(response.user, response.token, response.refreshToken);
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  }, [setAuth]);

  const handleLogout = useCallback(async () => {
    setLoading(true);
    try {
      await apiClient.logout();
    } finally {
      logout();
      router.replace('/login');
      setLoading(false);
    }
  }, [logout]);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const userData = await apiClient.getProfile();
      // Atualiza store com dados frescos
      // useAppStore.getState().updateUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [isAuthenticated]);

  return {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    register,
    logout: handleLogout,
    refreshUser,
  };
}