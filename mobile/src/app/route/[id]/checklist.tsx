'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, Alert, ActivityIndicator, Button, ScrollView, RefreshControl, Platform } from 'react-native';
import { useRoutes } from '@/shared/hooks/useRoutes';
import { useAppStore } from '@/shared/store';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { DraggableFlatList } from '@/shared/ui/DraggableFlatList';
import { styles } from './styles';

export default function ChecklistScreen({ route }) {
  const { id } = route.params;
  const { routes, loading, refreshing, fetchRoutes, updateRoute, optimizeRoute, startRoute } = useRoutes();
  const { currentRouteId, setCurrentRoute } = useAppStore();
  const [showOptimizeConfirm, setShowOptimizeConfirm] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const currentRoute = routes.find(r => r.id === id);

  useEffect(() => {
    fetchRoutes();
    setCurrentRoute(id);
  }, [fetchRoutes, setCurrentRoute, id]);

  useEffect(() => {
    return () => setCurrentRoute(null);
  }, [setCurrentRoute]);

  const handleRefresh = useCallback(async () => {
    await fetchRoutes();
  }, [fetchRoutes]);

  const handleReorder = useCallback(async (fromIndex: number, toIndex: number) => {
    if (!currentRoute) return;
    
    const waypoints = [...currentRoute.waypoints];
    const [moved] = waypoints.splice(fromIndex, 1);
    waypoints.splice(toIndex, 0, moved);
    
    // Atualiza ordens
    const updatedWaypoints = waypoints.map((w, idx) => ({ ...w, ordem: idx }));
    
    try {
      await updateRoute(id, { waypoints: updatedWaypoints });
    } catch (error) {
      Alert.alert('Erro', 'Falha ao reordenar');
      // Reverte localmente se falhar
      fetchRoutes();
    }
  }, [currentRoute, id, updateRoute, fetchRoutes]);

  const handleStatusChange = useCallback(async (waypointId: string, newStatus: string) => {
    if (!currentRoute) return;
    
    const waypoints = currentRoute.waypoints.map(w => 
      w.id === waypointId ? { ...w, status: newStatus } : w
    );
    
    try {
      await updateRoute(id, { waypoints });
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar status');
      fetchRoutes();
    }
  }, [currentRoute, id, updateRoute, fetchRoutes]);

  const handleOptimize = useCallback(async () => {
    setShowOptimizeConfirm(false);
    try {
      await optimizeRoute(id);
      Alert.alert('Sucesso', 'Rota otimizada com economia estimada!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao otimizar rota');
    }
  }, [id, optimizeRoute]);

  const handleStart = useCallback(async () => {
    setShowStartConfirm(false);
    try {
      await startRoute(id);
      Alert.alert('Rota iniciada', 'Boa viagem! Navegação disponível no mapa.');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao iniciar rota');
    }
  }, [id, startRoute]);

  if (loading && !currentRoute) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Carregando rota...</Text>
      </View>
    );
  }

  if (!currentRoute) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
        <Text style={styles.emptyTitle}>Rota não encontrada</Text>
      </View>
    );
  }

  const statusColors = {
    pendente: '#94A3B8',
    em_rota: '#3B82F6',
    entregue: '#059669',
    problema: '#F59E0B',
    cancelada: '#DC2626',
  };

  const statusLabels = {
    pendente: 'Pendente',
    em_rota: 'Em Rota',
    entregue: 'Entregue',
    problema: 'Problema',
    cancelada: 'Cancelada',
  };

  const statusIcons = {
    pendente: 'circle-outline',
    em_rota: 'navigation-outline',
    entregue: 'checkmark-circle-outline',
    problema: 'alert-circle-outline',
    cancelada: 'close-circle-outline',
  };

  const canOptimize = currentRoute.status === 'rascunho' || currentRoute.status === 'otimizada';
  const canStart = currentRoute.status === 'otimizada';
  const isActive = currentRoute.status === 'em_andamento';
  const isFinished = currentRoute.status === 'concluida' || currentRoute.status === 'parcial';

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={[
        styles.waypointItem,
        draggingId === item.id && styles.dragging,
        item.status === 'em_rota' && styles.activeWaypoint,
      ]}
      onPress={() => !isFinished && router.push(`/route/${id}/waypoint/${item.id}`)}
      onLongPress={() => !isFinished && setDraggingId(item.id)}
      onPressOut={() => setDraggingId(null)}
    >
      <View style={styles.waypointMain}>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: statusColors[item.status as keyof typeof statusColors] },
            ]}
          />
          <Ionicons
            name={statusIcons[item.status as keyof typeof statusIcons]}
            size={18}
            color={statusColors[item.status as keyof typeof statusColors]}
          />
        </View>

        <View style={styles.waypointContent} flex={1}>
          <View style={styles.waypointHeader}>
            <Text style={styles.waypointNumber}>{index + 1}</Text>
            <Text style={styles.waypointName}>{item.enderecoNome || item.nome || 'Endereço'}</Text>
          </View>
          <Text style={styles.waypointAddress}>{item.enderecoFormatado}</Text>
          
          {item.destinatario && (
            <View style={styles.destinatario}>
              <Ionicons name="person-outline" size={14} color="#64748B" />
              <Text style={styles.destinatarioText}>
                {item.destinatario.nome} - {item.destinatario.telefone}
              </Text>
            </View>
          )}
        </View>

        {!isFinished && (
          <TouchableOpacity
            style={styles.dragHandle}
            onPressIn={() => setDraggingId(item.id)}
            onPressOut={() => setDraggingId(null)}
          >
            <Ionicons name="reorder-three-outline" size={24} color="#94A3B8" />
          </TouchableOpacity>
        )}

        {isFinished && (
          <View style={styles.finishedBadge}>
            <Text style={styles.finishedText}>Finalizado</Text>
          </View>
        )}
      </View>
    )
  );

  const header = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#0066CC" />
        </TouchableOpacity>
        <View>
          <Text style={styles.routeTitle}>{currentRoute.nome}</Text>
          <Text style={styles.routeDate}>{formatDate(currentRoute.data)}</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.statusBadge} onPress={() => {}}>
          <View
            style={[
              styles.statusBadgeDot,
              { backgroundColor: statusColors[currentRoute.status as keyof typeof statusColors] },
            ]}
          />
          <Text style={styles.statusBadgeText}>{statusLabels[currentRoute.status as keyof typeof statusLabels]}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const footer = () => {
    if (isFinished) {
      return (
        <View style={styles.footerFinished}>
          <Text style={styles.finishedMessage}>
            Rota {currentRoute.status === 'concluida' ? 'concluída' : 'finalizada parcialmente'}!
          </Text>
          <TouchableOpacity style={styles.reportButton} onPress={() => router.push(`/history/${id}`)}>
            <Text style={styles.reportButtonText}>Ver Relatório</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isActive) {
      return (
        <View style={styles.footerActive}>
          <TouchableOpacity style={styles.mapButton} onPress={() => router.push(`/route/${id}/map`)}>
            <Ionicons name="map-outline" size={20} color="#FFFFFF" />
            <Text style={styles.mapButtonText}>Ver Mapa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={() => router.push(`/route/${id}/navigation`)}>
            <Ionicons name="navigation-outline" size={20} color="#FFFFFF" />
            <Text style={styles.navButtonText}>Navegar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.footerActions}>
        {canOptimize && (
          <TouchableOpacity style={[styles.actionButton, styles.optimizeButton]} onPress={() => setShowOptimizeConfirm(true)}>
            <Ionicons name="swap-horizontal-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Otimizar Rota</Text>
          </TouchableOpacity>
        )}
        {canStart && (
          <TouchableOpacity style={[styles.actionButton, styles.startButton]} onPress={() => setShowStartConfirm(true)}>
            <Ionicons name="play-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Iniciar Rota</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={currentRoute.waypoints}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        onDragEnd={handleReorder}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0066CC']} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Nenhum endereço na rota</Text>
          </View>
        }
      />

      {/* Modal Confirmar Otimização */}
      <Modal visible={showOptimizeConfirm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="swap-horizontal-outline" size={48} color="#3B82F6" />
            <Text style={styles.modalTitle}>Otimizar Rota</Text>
            <Text style={styles.modalText}>
              O sistema calculará a melhor ordem para {currentRoute.waypoints.length} entregas usando algoritmos de roteirização avançados.
            </Text>
            <View style={styles.modalButtons}>
              <Button title="Cancelar" onPress={() => setShowOptimizeConfirm(false)} color="#94A3B8" />
              <Button title="Otimizar" onPress={handleOptimize} color="#3B82F6" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Confirmar Início */}
      <Modal visible={showStartConfirm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="play-circle-outline" size={48} color="#059669" />
            <Text style={styles.modalTitle}>Iniciar Rota</Text>
            <Text style={styles.modalText}>
              A rota será iniciada e o primeiro endereço ficará "Em Rota". A navegação estará disponível no mapa.
            </Text>
            <View style={styles.modalButtons}>
              <Button title="Cancelar" onPress={() => setShowStartConfirm(false)} color="#94A3B8" />
              <Button title="Iniciar" onPress={handleStart} color="#059669" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Import router
import { router } from 'expo-router';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
}