'use client';

import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal } from 'react-native';
import { useRoutes } from '@/shared/hooks/useRoutes';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';

export default function RoutesScreen() {
  const { routes, loading, refreshing, fetchRoutes, deleteRoute } = useRoutes();

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const renderRoute = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.routeCard} onPress={() => router.push(`/route/${item.id}/checklist`)}>
      <View style={styles.routeHeader}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeName}>{item.nome}</Text>
          <Text style={styles.routeDate}>{formatDate(item.data)}</Text>
        </View>
        <View style={styles.routeStatusContainer}>
          <Text style={[styles.routeStatus, { backgroundColor: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.routeStats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.waypoints?.length || 0}</Text>
          <Text style={styles.statLabel}>Endereços</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.metricas?.distanciaTotalKm?.toFixed(1) || '0'} km</Text>
          <Text style={styles.statLabel}>Distância</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatTime(item.metricas?.tempoEstimadoMin || 0)}</Text>
          <Text style={styles.statLabel}>Tempo est.</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={(e) => {
          e.stopPropagation();
          router.push(`/route/${item.id}/checklist`);
        }}
      >
        <Ionicons name="chevron-forward-outline" size={20} color="#0066CC" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const handleRefresh = async () => {
    await fetchRoutes();
  };

  const handleDelete = (routeId: string) => {
    Alert.alert(
      'Excluir rota',
      'Tem certeza que deseja excluir esta rota? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteRoute(routeId) },
      ]
    );
  };

  if (loading && routes.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Carregando rotas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minhas Rotas</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/route/new')}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={routes}
        renderItem={renderRoute}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0066CC']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Nenhuma rota criada</Text>
            <Text style={styles.emptySubtitle}>Toque no + para criar sua primeira rota</Text>
          </View>
        }
      />
    </View>
  );
}

// Import router and formatters
import { router } from 'expo-router';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'rascunho': return '#94A3B8';
    case 'otimizada': return '#3B82F6';
    case 'em_andamento': return '#F59E0B';
    case 'concluida': return '#059669';
    case 'parcial': return '#8B5CF6';
    case 'cancelada': return '#DC2626';
    default: return '#94A3B8';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'rascunho': return 'Rascunho';
    case 'otimizada': return 'Otimizada';
    case 'em_andamento': return 'Em Andamento';
    case 'concluida': return 'Concluída';
    case 'parcial': return 'Parcial';
    case 'cancelada': return 'Cancelada';
    default: return status;
  }
}