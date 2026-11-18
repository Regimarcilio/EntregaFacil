import { useState, useCallback, useRef } from 'react';
import { apiClient } from '../api/client';
import { useAppStore } from '../store';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface Waypoint {
  id: string;
  enderecoId: string;
  ordem: number;
  status: 'pendente' | 'em_rota' | 'entregue' | 'problema' | 'cancelada';
  latitude: number;
  longitude: number;
  enderecoNome?: string;
  enderecoFormatado?: string;
}

export interface OSRMTripResult {
  waypoints: Array<{
    location: [number, number];
    waypoint_index: number;
  }>;
  trips: Array<{
    geometry: string; // polyline6
    legs: Array<{
      distance: number;
      duration: number;
      steps: Array<{
        distance: number;
        duration: number;
        name: string;
        maneuver: {
          type: string;
          instruction: string;
          location: [number, number];
          modifier?: string;
        };
      }>;
      distance: number;
      duration: number;
    }>;
    distance: number;
    duration: number;
  }>;
  code: string;
}

export interface RouteLeg {
  distance: number;
  duration: number;
  steps: Array<{
    distance: number;
    duration: number;
    name: string;
    instruction: string;
    location: [number, number];
    modifier?: string;
  }>;
}

export interface OptimizedRoute {
  waypoints: any[];
  geometry: string; // polyline6
  legs: RouteLeg[];
  totalDistance: number; // metros
  totalDuration: number; // segundos
}

export function useOSRM() {
  const [optimizing, setOptimizing] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<OptimizedRoute | null>(null);
  const [currentLegIndex, setCurrentLegIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [offRoute, setOffRoute] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const { routes, updateRoute, currentRouteId } = useAppStore();

  // Inicia tracking de localização
  const startLocationTracking = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permissão de localização negada');
    }

    // Inicia watch position
    watchIdRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (location) => {
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        // Verifica se saiu da rota
        if (currentRoute && navigating) {
          checkOffRoute(location.coords.latitude, location.coords.longitude);
        }
      }
    );
  }, [currentRoute, navigating]);

  // Para tracking
  const stopLocationTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      await Location.stopAsync(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Otimiza rota via API
  const optimizeRoute = useCallback(async (waypoints: Array<{ latitude: number; longitude: number }>) => {
    setOptimizing(true);
    try {
      const coordinates = waypoints.map(w => `${w.longitude},${w.latitude}`).join(';');
      // Usa apiClient que já tem interceptors de auth
      const response = await apiClient.post('/routes/optimize-trip', { coordinates });
      return response;
    } catch (error) {
      console.error('Optimize route error:', error);
      throw error;
    } finally {
      setOptimizing(false);
    }
  }, []);

  // Inicia navegação
  const startNavigation = useCallback((optimizedRoute: OptimizedRoute) => {
    setCurrentRoute(optimizedRoute);
    setCurrentLegIndex(0);
    setCurrentStepIndex(0);
    setNavigating(true);
    startLocationTracking();
  }, [startLocationTracking]);

  // Para navegação
  const stopNavigation = useCallback(() => {
    setNavigating(false);
    setCurrentRoute(null);
    setCurrentLegIndex(0);
    setCurrentStepIndex(0);
    stopLocationTracking();
  }, [stopLocationTracking]);

  // Avança para próxima instrução/passo
  const nextStep = useCallback(() => {
    if (!currentRoute) return;

    const currentLeg = currentRoute.legs[currentLegIndex];
    if (currentStepIndex < currentLeg.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else if (currentLegIndex < currentRoute.legs.length - 1) {
      setCurrentLegIndex(prev => prev + 1);
      setCurrentStepIndex(0);
    }
  }, [currentRoute, currentLegIndex, currentStepIndex]);

  // Verifica se usuário saiu da rota
  const checkOffRoute = useCallback((lat: number, lng: number) => {
    if (!currentRoute || !currentRoute.legs[currentLegIndex]) return;

    // Simplificado: verifica distância para próxima instrução
    const currentLeg = currentRoute.legs[currentLegIndex];
    const currentStep = currentLeg.steps[currentStepIndex];
    
    if (currentStep && currentStep.location) {
      const [stepLng, stepLat] = currentStep.location;
      const distance = calculateDistance(lat, lng, stepLat, stepLng);
      
      // Se está a mais de 100m da instrução atual por mais de 30s, considera off-route
      if (distance > 100) {
        setOffRoute(true);
        // TODO: Trigger recálculo automático após 30s
      } else {
        setOffRoute(false);
      }
    }
  }, [currentRoute, currentLegIndex, currentStepIndex]);

  // Recalcula rota a partir da localização atual
  const recalculateRoute = useCallback(async (remainingWaypoints: Array<{ latitude: number; longitude: number }>) => {
    if (!userLocation || remainingWaypoints.length < 2) return;

    const coords = [
      [userLocation.longitude, userLocation.latitude],
      ...remainingWaypoints.map(w => [w.longitude, w.latitude]),
    ];

    try {
      // Chama API de recálculo
      const response = await apiClient.post('/routes/recalculate', {
        coordinates: coords.map(([lng, lat]) => `${lng},${lat}`).join(';'),
      });
      return response;
    } catch (error) {
      console.error('Recalculate route error:', error);
      throw error;
    }
  }, [userLocation]);

  // Obtém instrução atual formatada
  const getCurrentInstruction = useCallback(() => {
    if (!currentRoute || !currentRoute.legs[currentLegIndex]) return null;
    
    const currentLeg = currentRoute.legs[currentLegIndex];
    const currentStep = currentLeg.steps[currentStepIndex];
    
    if (!currentStep) return null;

    return {
      instruction: currentStep.instruction,
      distance: currentStep.distance,
      streetName: currentStep.name,
      modifier: currentStep.modifier,
    };
  }, [currentRoute, currentLegIndex, currentStepIndex]);

  // Obtém distância até próxima manobra
  const getDistanceToNextManeuver = useCallback(() => {
    if (!currentRoute || !currentRoute.legs[currentLegIndex]) return null;
    
    const currentLeg = currentRoute.legs[currentLegIndex];
    const currentStep = currentLeg.steps[currentStepIndex];
    
    if (!currentStep || !userLocation) return currentStep?.distance || 0;

    const [stepLng, stepLat] = currentStep.location;
    return calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      stepLat,
      stepLng
    );
  }, [currentRoute, currentLegIndex, currentStepIndex, userLocation]);

  // Cleanup
  const cleanup = useCallback(() => {
    stopNavigation();
  }, [stopNavigation]);

  return {
    // State
    optimizing,
    navigating,
    currentRoute,
    currentLegIndex,
    currentStepIndex,
    userLocation,
    offRoute,
    
    // Actions
    optimizeRoute,
    startNavigation,
    stopNavigation,
    nextStep,
    recalculateRoute,
    startLocationTracking,
    stopLocationTracking,
    cleanup,
    
    // Computed
    getCurrentInstruction,
    getDistanceToNextManeuver,
  };
}

// Helper: Calcula distância entre dois pontos (Haversine)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Raio da Terra em metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // metros
}

export default useOSRM;