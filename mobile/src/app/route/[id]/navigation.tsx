'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Modal, StyleSheet, Platform, Image } from 'react-native';
import { useRoutes } from '@/shared/hooks/useRoutes';
import { useAppStore } from '@/shared/store';
import { useOSRM, RouteLeg } from '@/shared/hooks/useOSRM';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MapView, Marker, Polyline, Callout } from '@maplibre/maplibre-react-native';
import { styles } from './navigationStyles';

interface RouteParams {
  id: string;
}

export default function NavigationScreen({ route }: { route: { params: RouteParams } }) {
  const { id } = route.params;
  const { routes, updateRoute } = useRoutes();
  const { currentRouteId, setCurrentRoute, setNavigationState } = useAppStore();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showArrivedModal, setShowArrivedModal] = useState(false);
  const [showEndRouteModal, setShowEndRouteModal] = useState(false);
  const [drivingMode, setDrivingMode] = useState(false);
  const mapRef = useRef<any>(null);

  const currentRoute = routes.find(r => r.id === id);
  const waypoint = currentRoute?.waypoints.find(w => w.status === 'em_rota');

  const {
    navigating,
    currentRoute: osrmRoute,
    currentLegIndex,
    currentStepIndex,
    userLocation,
    offRoute,
    getCurrentInstruction,
    getDistanceToNextManeuver,
    startNavigation,
    stopNavigation,
    nextStep,
    recalculateRoute,
    startLocationTracking,
    stopLocationTracking,
    cleanup,
    getCurrentInstruction,
    getDistanceToNextManeuver,
  } = useOSRM();

  useEffect(() => {
    setCurrentRoute(id);
    setNavigationState('navigating');
  }, [id, setCurrentRoute, setNavigationState]);

  useEffect(() => {
    return () => {
      setCurrentRoute(null);
      setNavigationState('idle');
    };
  }, [setCurrentRoute, setNavigationState]);

  // Inicia navegação quando waypoint está em_rota
  useEffect(() => {
    if (waypoint && !navigating && osrmRoute) {
      // Converte waypoints restantes para formato OSRM
      const currentRoute = routes.find(r => r.id === id);
      if (currentRoute) {
        const remainingWaypoints = currentRoute.waypoints
          .filter(w => w.status === 'em_rota' || w.status === 'pendente')
          .map(w => ({ latitude: w.latitude, longitude: w.longitude }));
        
        if (remainingWaypoints.length >= 2) {
          // Inicia navegação com rota já otimizada
          // TODO: Converter rota otimizada do backend para formato useOSRM
        }
      }
    }
  }, [waypoint, navigating, osrmRoute, routes, id]);

  const handleArrived = () => {
    setShowArrivedModal(true);
  };

  const handleEndRoute = () => {
    setShowEndRouteModal(true);
  };

  const handleRecalculate = async () => {
    // TODO: Implementar recálculo
    Alert.alert('Recalculando', 'Calculando nova rota...');
  };

  const toggleDrivingMode = () => {
    setDrivingMode(!drivingMode);
  };

  // Auto-ativa driving mode após 5s sem interação
  useEffect(() => {
    if (navigating && !drivingMode) {
      const timer = setTimeout(() => setDrivingMode(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [navigating, drivingMode]);

  const instruction = getCurrentInstruction?.();
  const distanceToNext = getDistanceToNextManeuver?.();

  if (!currentRoute || !waypoint) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Carregando navegação...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mapa Fullscreen */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          onMapLoaded={() => setMapLoaded(true)}
          initialCamera={{
            center: userLocation || { latitude: waypoint.latitude, longitude: waypoint.longitude },
            zoom: 16,
            pitch: 45,
            bearing: 0,
          }}
          followUserLocation={true}
          userLocationEnabled={true}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          rotateEnabled={true}
          pitchEnabled={true}
        >
          {/* Rota polyline */}
          {currentRoute?.geometry && (
            <Polyline
              coordinates={decodePolyline(currentRoute.geometry)}
              strokeColor="#00D4AA"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* Waypoints marcadores */}
          {currentRoute?.waypoints?.map((wp, idx) => (
            <Marker key={wp.id} coordinate={{ latitude: wp.latitude, longitude: wp.longitude }}>
              <View style={styles.marker}>
                <View style={[
                  styles.markerDot,
                  { backgroundColor: idx === 0 ? '#3B82F6' : wp.status === 'entregue' ? '#059669' : '#94A3B8' }
                ]}>
                  <Text style={styles.markerNumber}>{idx + 1}</Text>
                </View>
                <Callout>
                  <Text style={styles.calloutText}>{wp.enderecoNome || wp.nome}</Text>
                </Callout>
              </View>
            </Marker>
          ))}

          {/* Localização atual */}
          {userLocation && (
            <Marker coordinate={userLocation}>
              <View style={styles.userMarker}>
                <View style={styles.userMarkerInner} />
              </View>
            </Marker>
          )}
        </MapView>

        {/* Off-route banner */}
        {offRoute && (
          <View style={styles.offRouteBanner}>
            <Ionicons name="warning-outline" size={20} color="#FFFFFF" />
            <Text style={styles.offRouteText}>Fora da rota - Recalculando...</Text>
            <TouchableOpacity style={styles.recalculateBtn} onPress={handleRecalculate}>
              <Text style={styles.recalculateBtnText}>Recalcular Agora</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Instrução de navegação - Top Card */}
        {instruction && (
          <View style={[
            styles.instructionCard,
            drivingMode && styles.instructionCardDriving
          ]}>
            <View style={styles.instructionHeader}>
              <View style={[
                styles.maneuverIcon,
                { backgroundColor: getManeuverColor(instruction.modifier) }
              ]}>
                <Ionicons name={getManeuverIcon(instruction.modifier)} size={24} color="#FFFFFF" />
              </View>
              <View style={styles.instructionTextContainer}>
                <Text style={[
                  styles.instructionText,
                  drivingMode && styles.instructionTextDriving
                ]}>
                  {instruction.instruction}
                </Text>
                <Text style={[
                  styles.streetName,
                  drivingMode && styles.streetNameDriving
                ]}>
                  {instruction.streetName}
                </Text>
              </View>
            </View>
            <View style={styles.instructionFooter}>
              <View style={styles.distanceContainer}>
                <Ionicons name="navigate-outline" size={16} color="#64748B" />
                <Text style={[
                  styles.distanceText,
                  drivingMode && styles.distanceTextDriving
                ]}>
                  {formatDistance(distanceToNext)}
                </Text>
              </View>
              <View style={styles.legInfo}>
                <Text style={styles.legText}>
                  Etapa {currentLegIndex + 1} de {currentRoute?.legs?.length || 1}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Waypoint atual info - Bottom Card */}
        <View style={[
          styles.waypointCard,
          drivingMode && styles.waypointCardDriving
        ]}>
          <View style={styles.waypointHeader}>
            <View style={[
              styles.waypointStatusDot,
              { backgroundColor: getStatusColor(waypoint?.status) }
            ]} />
            <View style={styles.waypointInfo}>
              <Text style={[
                styles.waypointName,
                drivingMode && styles.waypointNameDriving
              ]}>
                {waypoint?.enderecoNome || waypoint?.nome}
              </Text>
              <Text style={[
                styles.waypointAddress,
                drivingMode && styles.waypointAddressDriving
              ]}>
                {waypoint?.enderecoFormatado}
              </Text>
            </View>
            <TouchableOpacity style={styles.arrivedButton} onPress={handleArrived} disabled={!navigating}>
              <Text style={styles.arrivedButtonText}>Cheguei</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Controles bottom */}
      <View style={[
        styles.controlsContainer,
        drivingMode && styles.controlsContainerDriving
      ]}>
        <TouchableOpacity style={[styles.controlButton, styles.mapButton]} onPress={() => mapRef.current?.fitBounds?.()}>
          <Ionicons name="map-outline" size={24} color="#0066CC" />
          <Text style={styles.controlButtonText}>Mapa</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.controlButton, styles.recenterButton]} onPress={() => mapRef.current?.animateToRegion?.({ latitude: userLocation?.latitude, longitude: userLocation?.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 })}>
          <Ionicons name="crosshair-outline" size={24} color="#0066CC" />
          <Text style={styles.controlButtonText}>Centralizar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.controlButton, styles.endRouteButton]} onPress={handleEndRoute}>
          <Ionicons name="stop-circle-outline" size={24} color="#DC2626" />
          <Text style={styles.controlButtonText}>Finalizar</Text>
        </TouchableOpacity>
      </View>

      {/* Driving Mode Toggle */}
      <TouchableOpacity style={styles.drivingModeToggle} onPress={toggleDrivingMode}>
        <Ionicons name={drivingMode ? 'car-outline' : 'car-sport-outline'} size={28} color="#0066CC" />
        <Text style={styles.drivingModeText}>{drivingMode ? 'Modo Direção ON' : 'Toque para Modo Direção'}</Text>
      </TouchableOpacity>

      {/* Modals */}
      <Modal visible={showArrivedModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#059669" />
            <Text style={styles.modalTitle}>Chegou ao destino!</Text>
            <Text style={styles.modalText}>
              Confirma a entrega em <strong>{waypoint?.enderecoNome}</strong>?
            </Text>
            <View style={styles.modalButtons}>
              <Button title="Cancelar" onPress={() => setShowArrivedModal(false)} color="#94A3B8" />
              <Button title="Confirmar Entrega" onPress={() => router.push(`/route/${id}/proof/${waypoint?.id}`)} color="#059669" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showEndRouteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="alert-circle-outline" size={48} color="#F59E0B" />
            <Text style={styles.modalTitle}>Finalizar Rota</Text>
            <Text style={styles.modalText}>
              Tem certeza? A rota será marcada como finalizada.
            </Text>
            <View style={styles.modalButtons}>
              <Button title="Cancelar" onPress={() => setShowEndRouteModal(false)} color="#94A3B8" />
              <Button title="Finalizar" onPress={handleEndRoute} color="#DC2626" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Imports
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRoutes } from '@/shared/hooks/useRoutes';
import { useAppStore } from '@/shared/store';
import { useOSRM } from '@/shared/hooks/useOSRM';

// Helpers
function decodePolyline(encoded: string) {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1); lat += deltaLat;
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1); lng += deltaLng;
    points.push({ latitude: lat / 1e6, longitude: lng / 1e6 });
  }
  return points;
}

function getManeuverColor(modifier?: string) {
  switch (modifier) {
    case 'left': return '#3B82F6';
    case 'right': return '#F59E0B';
    case 'straight': return '#059669';
    case 'sharp left': return '#8B5CF6';
    case 'sharp right': return '#EF4444';
    default: return '#0066CC';
  }
}

function getManeuverIcon(modifier?: string) {
  switch (modifier) {
    case 'left': return 'navigate-outline';
    case 'right': return 'navigate-outline';
    case 'straight': return 'arrow-forward-outline';
    case 'sharp left': return 'arrow-back-circle-outline';
    case 'sharp right': return 'arrow-forward-circle-outline';
    default: return 'navigate-outline';
  }
}

function getStatusColor(status?: string) {
  switch (status) {
    case 'em_rota': return '#3B82F6';
    case 'entregue': return '#059669';
    case 'problema': return '#F59E0B';
    case 'cancelada': return '#DC2626';
    default: return '#94A3B8';
  }
}

function formatDistance(meters?: number) {
  if (!meters) return '--';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}