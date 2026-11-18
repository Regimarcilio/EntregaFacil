'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import MapView, { Camera, Marker, Polyline, Callout, MarkerProps } from '@maplibre/maplibre-react-native';
import { useOfflineMaps, MapRegion } from '../hooks/useOfflineMaps';
import { colors, spacing, borderRadius, typography } from '../constants/theme';

interface MapViewProps {
  style?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  routeGeometry?: string; // polyline6
  waypoints?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title: string;
    status: string;
    ordem: number;
  }>;
  userLocation?: { latitude: number; longitude: number } | null;
  onMapLoaded?: () => void;
  onRegionChange?: (region: any) => void;
  onMarkerPress?: (marker: any) => void;
  showUserLocation?: boolean;
  followUserLocation?: boolean;
  pitchEnabled?: boolean;
  rotateEnabled?: boolean;
}

export const MapViewComponent: React.FC<MapViewProps> = ({
  style,
  initialRegion = { latitude: -23.5505, longitude: -46.6333, latitudeDelta: 0.05, longitudeDelta: 0.05 },
  routeGeometry,
  waypoints = [],
  userLocation,
  onMapLoaded,
  onRegionChange,
  onMarkerPress,
  showUserLocation = true,
  followUserLocation = false,
  pitchEnabled = true,
  rotateEnabled = true,
}) => {
  const mapRef = useRef<any>(null);
  const [mapStyle, setMapStyle] = useState<string | null>(null);
  const [offlineRegions, setOfflineRegions] = useState<MapRegion[]>([]);
  const { manifest, downloads, downloadRegion, isDownloading, isCompleted, getProgress } = useOfflineMaps();
  
  // Carrega manifest ao montar
  useEffect(() => {
    // fetchManifest é chamado automaticamente no hook
  }, []);

  // Gera style JSON dinâmico baseado em regiões offline disponíveis
  useEffect(() => {
    const generateStyle = () => {
      const sources: Record<string, any> = {};
      
      // Adiciona fontes offline para cada região baixada
      for (const region of manifest) {
        const download = downloads.get(region.id);
        if (download?.status === 'completed') {
          sources[`offline-${region.id}`] = {
            type: 'vector',
            url: `mbtiles://${region.id}`,
            minzoom: 0,
            maxzoom: 16,
          };
        }
      }

      // Se não tem regiões offline, usa estilo online (fallback)
      if (Object.keys(sources).length === 0) {
        return {
          version: 8,
          sources: {
            'osm': {
              type: 'vector',
              tiles: ['https://tiles.openmaptiles.org/{z}/{x}/{y}.pbf'],
              minzoom: 0,
              maxzoom: 14,
            },
          },
          layers: getDefaultLayers(),
        };
      }

      return {
        version: 8,
        sources,
        layers: getDefaultLayers(),
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
        sprite: 'https://sprites.openmaptiles.org/osm-bright/sprite',
      };
    };

    setMapStyle(JSON.stringify(generateStyle()));
  }, [manifest, downloads]);

  // Baixa região quando usuário clica
  const handleDownloadRegion = useCallback(async (region: MapRegion) => {
    Alert.alert(
      'Baixar Mapa Offline',
      `Baixar ${region.name} (${(region.size / 1024 / 1024).toFixed(0)}MB)?\n\nRequer Wi-Fi.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Baixar', onPress: () => downloadRegion(region) },
      ]
    );
  }, [downloadRegion]);

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        styleURL={mapStyle || 'https://tiles.openmaptiles.org/styles/osm-bright/style.json'}
        initialCamera={{
          center: { latitude: initialRegion.latitude, longitude: initialRegion.longitude },
          zoom: 13,
          pitch: 0,
          bearing: 0,
        }}
        onMapLoaded={onMapLoaded}
        onRegionChange={onRegionChange}
        pitchEnabled={pitchEnabled}
        rotateEnabled={rotateEnabled}
        showsUserLocation={showUserLocation}
        userTrackingMode={followUserLocation ? 'follow' : 'none'}
        zoomEnabled={true}
        scrollEnabled={true}
        zoomControlEnabled={true}
        compassEnabled={true}
        scaleBarEnabled={true}
      >
        {/* Rota polyline */}
        {routeGeometry && (
          <Polyline
            coordinates={decodePolyline(routeGeometry)}
            strokeColor="#00D4AA"
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
            strokeOpacity={0.9}
          />
        )}

        {/* Waypoints */}
        {waypoints.map((wp, idx) => (
          <Marker
            key={wp.id}
            coordinate={{ latitude: wp.latitude, longitude: wp.longitude }}
            onPress={() => onMarkerPress?.(wp)}
          >
            <View style={styles.marker}>
              <View style={[
                styles.markerDot,
                { 
                  backgroundColor: idx === 0 ? '#3B82F6' : 
                    wp.status === 'entregue' ? '#059669' : 
                    wp.status === 'problema' ? '#F59E0B' : '#94A3B8' 
                }
              ]}>
                <Text style={styles.markerNumber}>{idx + 1}</Text>
              </View>
              <Callout style={styles.callout}>
                <Text style={styles.calloutText}>{wp.title}</Text>
                <Text style={styles.calloutSubtext}>#{idx + 1} • {wp.status}</Text>
              </Callout>
            </View>
          </Marker>
        ))}

        {/* User location */}
        {userLocation && (
          <Marker coordinate={userLocation}>
            <View style={styles.userMarker}>
              <View style={styles.userMarkerInner} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Overlay de download offline */}
      {manifest.length > 0 && (
        <View style={styles.offlineOverlay}>
          <Text style={styles.offlineTitle}>Mapas Offline Disponíveis</Text>
          <FlatList
            data={manifest.filter(r => !isCompleted(r.id))}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.offlineItem} onPress={() => handleDownloadRegion(item)}>
                <View style={styles.offlineItemInfo}>
                  <Text style={styles.offlineItemName}>{item.name}</Text>
                  <Text style={styles.offlineItemSize}>
                    {isDownloading(item.id) ? 'Baixando...' : 
                     isCompleted(item.id) ? 'Baixado ✓' : 
                     `${(item.size / 1024 / 1024).toFixed(0)}MB`}
                  </Text>
                </View>
                {isDownloading(item.id) && (
                  <View style={styles.progressBar}>
                    <View style={[
                      styles.progressFill,
                      { width: `${getProgress(item.id) * 100}%` }
                    ]} />
                  </View>
                )}
                {isCompleted(item.id) && (
                  <Ionicons name="checkmark-circle" size={24} color="#059669" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

// Imports
import { View, StyleSheet, FlatList, TouchableOpacity, Ionicons } from 'react-native';
import { decodePolyline } from '../../utils/geo';

// Helper: decode polyline6
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  marker: {
    alignItems: 'center',
  },
  markerDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  callout: {
    padding: 8,
  },
  calloutText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  calloutSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  userMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0066CC',
  },
  offlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  offlineItemInfo: {
    flex: 1,
  },
  offlineItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  offlineItemSize: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  progressBar: {
    width: 80,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D4AA',
    borderRadius: 3,
  },
});

export default MapViewComponent;