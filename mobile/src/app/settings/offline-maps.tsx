'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useOfflineMaps, MapRegion, formatBytes } from '@/shared/hooks/useOfflineMaps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './offlineMapsStyles';

export default function OfflineMapsScreen() {
  const { manifest, downloads, fetchManifest, downloadRegion, pauseDownload, removeRegion, isDownloading, isCompleted, getProgress, getDownloadStatus } = useOfflineMaps();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchManifest();
  }, [fetchManifest]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchManifest(true);
    setRefreshing(false);
  };

  const handleDownload = (region: MapRegion) => {
    Alert.alert(
      'Baixar Mapa Offline',
      `Deseja baixar ${region.name} (${(region.size / 1024 / 1024).toFixed(0)}MB)?\n\nRequer conexão Wi-Fi. O download pode ser pausado e retomado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Baixar', onPress: () => downloadRegion(region) },
      ]
    );
  };

  const handleRemove = (region: MapRegion) => {
    Alert.alert(
      'Remover Mapa',
      `Tem certeza que deseja remover ${region.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => removeRegion(region.id) },
      ]
    );
  };

  const handlePause = (regionId: string) => {
    pauseDownload(regionId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'downloading': return '#3B82F6';
      case 'completed': return '#059669';
      case 'paused': return '#F59E0B';
      case 'error': return '#DC2626';
      default: return '#94A3B8';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'downloading': return 'Baixando...';
      case 'completed': return 'Baixado ✓';
      case 'paused': return 'Pausado';
      case 'error': return 'Erro';
      default: return 'Não baixado';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#0066CC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mapas Offline</Text>
        <TouchableOpacity onPress={() => setRefreshing(true) || fetchManifest(true).then(() => setRefreshing(false))} disabled={refreshing}>
          <Ionicons name={refreshing ? 'refresh-circle' : 'refresh-outline'} size={28} color="#0066CC" spin={refreshing} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0066CC']} />
      }>
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information-outline" size={24} color="#0066CC" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Como funciona</Text>
            <Text style={styles.infoText}>
              Baixe mapas da sua região para navegar 100% offline. Os mapas usam tiles vetoriais (MBTiles) 
              com estilo customizado EntregaFácil. Atualizações mensais automáticas.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Regiões Disponíveis</Text>
          <Text style={styles.sectionSubtitle}>
            {manifest.length} regiões • Toque para baixar/remover
          </Text>
        </View>

        {manifest.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.emptyText}>Carregando regiões...</Text>
          </View>
        ) : (
          <FlatList
            data={manifest}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.regionCard}>
                <View style={styles.regionHeader}>
                  <View style={styles.regionInfo}>
                    <View style={styles.regionNameRow}>
                      <Text style={styles.regionName}>{item.name}</Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(getDownloadStatus(item.id)) }
                      ]}>
                        <Text style={styles.statusBadgeText}>{getStatusText(getDownloadStatus(item.id))}</Text>
                      </View>
                    </View>
                    <Text style={styles.regionSize}>
                      {formatBytes(item.size)} • v{item.version} • Zoom 0-16
                    </Text>
                  </View>
                  <View style={styles.regionProgress}>
                    {isDownloading(item.id) && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View style={[
                            styles.progressFill,
                            { width: `${getProgress(item.id) * 100}%` }
                          ]} />
                        </View>
                        <Text style={styles.progressText}>
                          {Math.round(getProgress(item.id) * 100)}%
                        </Text>
                      </View>
                    )}
                    {isCompleted(item.id) && (
                      <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item)}>
                        <Ionicons name="trash-outline" size={20} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                    {!isDownloading(item.id) && !isCompleted(item.id) && (
                      <TouchableOpacity style={styles.downloadButton} onPress={() => handleDownload(item)}>
                        <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.downloadButtonText}>Baixar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}
          />
        )}

        <View style={styles.storageInfo}>
          <MaterialCommunityIcons name="database" size={24} color="#64748B" />
          <View>
            <Text style={styles.storageTitle}>Armazenamento</Text>
            <Text style={styles.storageText}>
              Verifique o espaço disponível antes de baixar mapas grandes.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Imports
import { router } from 'expo-router';
import { RefreshControl, FlatList } from 'react-native';