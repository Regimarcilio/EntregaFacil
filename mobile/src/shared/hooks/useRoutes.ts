import { useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { apiClient } from '../api/client';
import { Rota } from '../store';

export function useRoutes() {
  const { routes, setRoutes, addRoute, updateRoute, removeRoute, setCurrentRoute } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.getRoutes();
      setRoutes(data);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setRoutes]);

  const refreshRoutes = useCallback(async () => {
    setRefreshing(true);
    await fetchRoutes();
  }, [fetchRoutes]);

  const createRoute = useCallback(async (data: Partial<Rota>) => {
    try {
      const newRoute = await apiClient.createRoute(data);
      addRoute(newRoute);
      return newRoute;
    } catch (error) {
      console.error('Failed to create route:', error);
      throw error;
    }
  }, [addRoute]);

  const updateRouteData = useCallback(async (id: string, data: Partial<Rota>) => {
    try {
      const updated = await apiClient.updateRoute(id, data);
      updateRoute(id, updated);
      return updated;
    } catch (error) {
      console.error('Failed to update route:', error);
      throw error;
    }
  }, [updateRoute]);

  const deleteRoute = useCallback(async (id: string) => {
    try {
      await apiClient.deleteRoute(id);
      removeRoute(id);
    } catch (error) {
      console.error('Failed to delete route:', error);
      throw error;
    }
  }, [removeRoute]);

  const optimizeRoute = useCallback(async (id: string) => {
    try {
      const optimized = await apiClient.optimizeRoute(id);
      updateRoute(id, optimized);
      return optimized;
    } catch (error) {
      console.error('Failed to optimize route:', error);
      throw error;
    }
  }, [updateRoute]);

  const startRoute = useCallback(async (id: string) => {
    try {
      const started = await apiClient.startRoute(id);
      updateRoute(id, started);
      setCurrentRoute(id);
      return started;
    } catch (error) {
      console.error('Failed to start route:', error);
      throw error;
    }
  }, [updateRoute, setCurrentRoute]);

  const finishRoute = useCallback(async (id: string) => {
    try {
      const finished = await apiClient.finishRoute(id);
      updateRoute(id, finished);
      return finished;
    } catch (error) {
      console.error('Failed to finish route:', error);
      throw error;
    }
  }, [updateRoute]);

  return {
    routes,
    loading,
    refreshing,
    fetchRoutes,
    refreshRoutes,
    createRoute,
    updateRoute: updateRouteData,
    deleteRoute,
    optimizeRoute,
    startRoute,
    finishRoute,
  };
}