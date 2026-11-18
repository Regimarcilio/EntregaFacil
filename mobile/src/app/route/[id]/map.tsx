'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Platform, Alert } from 'react-native';
import { useRoutes } from '@/shared/hooks/useRoutes';
import { useAppStore } from '@/shared/store';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MapViewComponent } from '@/shared/ui/MapView';
import { styles } from './mapStyles';

interface RouteParams {
  id: string;
}

export default function MapScreen({ route }: { route: { params: RouteParams } }) {
  const { id } = route.params;
  const { routes } = useRoutes();
  const { currentRouteId } = useAppStore();

  const currentRoute = routes.find(r => r.id === id);
  const waypoint = currentRoute?.waypoints.find(w => w.status === 'em_rota');

  const [followUser, setFollowUser] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  const waypoints = currentRoute?.waypoints || [];
  const routeGeometry = currentRoute?.geometry;

  const handleMapLoaded = () => {
    setMapLoaded(true);
  };

  const handleMarkerPress = (marker: any) => {
    const wp = waypoints.find(w => w.id === marker.id);
    if (wp) {
      Alert.alert(
        wp.enderecoNome || wp.nome,
        wp.enderecoFormatado,
        [
          { text: 'OK', style: 'cancel' },
          { text: wp.status === 'pendente' ? 'Navegar até aqui' : 'Ver detalhes', onPress: () => {
            if (wp.status === 'pendente') {
              router.push(`/route/${id}/navigation`);
            } else {
              router.push(`/route/${id}/waypoint/${wp.id}`);
            }
          }}
        ]
      );
    }
  };

  const handleRegionChange = (region: any) => {
    // Could save last viewed region
  };

  if (!currentRoute) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Carregando mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#0066CC" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.routeTitle}>{currentRoute.nome}</Text>
          <Text style={styles.routeDate}>{formatDate(currentRoute.data)}</Text>
        </View>
        <TouchableOpacity style={styles.centerButton} onPress={() => mapRef.current?.animateToRegion?.({
          latitude: waypoint?.latitude || -23.5505,
          longitude: waypoint?.longitude || -46.6333,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        })}>
          <Ionicons name="crosshair-outline" size={24} color="#0066CC" />
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapViewComponent
          ref={mapRef}
          initialRegion={{
            latitude: waypoint?.latitude || -23.5505,
            longitude: waypoint?.longitude || -46.6333,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          routeGeometry={currentRoute?.geometry}
          waypoints={currentRoute?.waypoints || []}
          userLocation={userLocation}
          onMapLoaded={handleMapLoaded}
          onRegionChange={handleRegionChange}
          onMarkerPress={handleMarkerPress}
          showUserLocation={true}
          followUserLocation={followUser}
          pitchEnabled={true}
          rotateEnabled={true}
        />

        {/* Status do waypoint atual */}
        {waypoint && (
          <View style={styles.currentWaypointCard}>
            <View style={styles.waypointStatusRow}>
              <View style={[
                styles.waypointStatusDot,
                { backgroundColor: getStatusColor(waypoint.status) }
              ]} />
              <View style={styles.waypointInfo}>
                <Text style={styles.waypointLabel}>Próxima Entrega</Text>
                <Text style={styles.waypointName}>{waypoint.enderecoNome || waypoint.nome}</Text>
              </View>
              <TouchableOpacity style={styles.navigateButton} onPress={() => router.push(`/route/${id}/navigation`)}>
                <Ionicons name="navigation-outline" size={20} color="#FFFFFF" />
                <Text style={styles.navigateButtonText}>Navegar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Legenda */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Legenda</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>Em Rota</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
              <Text style={styles.legendText}>Entregue</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Problema</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
              <Text style={styles.legendText}>Cancelada</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#94A3B8' }]} />
              <Text style={styles.legendText}>Pendente</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// Imports
import { router } from 'expo-router';
import { useRoutes } from '@/shared/hooks/useRoutes';
import { useAppStore } from '@/shared/store';

// Refs
const mapRef = React.useRef<any>(null);
const [followUser, setFollowUser] = React.useState(true);
const [userLocation, setUserLocation] = React.useState<{ latitude: number; longitude: number } | null>(null);

// Helpers
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'em_rota': return '#3B82F6';
    case 'entregue': return '#059669';
    case 'problema': return '#F59E0B';
    case 'cancelada': return '#DC2626';
    default: return '#94A3B8';
  }
}