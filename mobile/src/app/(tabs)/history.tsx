'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Alert, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { useAppStore } from '@/shared/store';
import { useRoutes } from '@/shared/hooks/useRoutes';
import { apiClient } from '@/shared/api/client';
import { styles } from './historyStyles';
import { colors, spacing, borderRadius, typography, shadows } from '@/shared/constants/theme';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoryRoute {
  id: string;
  nome: string;
  data: string;
  status: 'rascunho' | 'otimizada' | 'em_andamento' | 'concluida' | 'parcial' | 'cancelada';
  waypoints: any[];
  metricas?: {
    distanciaTotalKm: number;
    tempoEstimadoMin: number;
    tempoRealMin?: number;
    entregues: number;
    problemas: number;
    canceladas: number;
    ganhoEstimado: number;
    economiaVsManual: number;
  };
  createdAt: string;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { routes, loading: routesLoading, refreshRoutes } = useRoutes();
  const { user } = useAppStore();

  const [filteredRoutes, setFilteredRoutes] = useState<HistoryRoute[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | 'concluida' | 'parcial' | 'cancelada' | 'em_andamento',
    startDate: null as Date | null,
    endDate: null as Date | null,
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalRotas: 0,
    totalEntregas: 0,
    totalProblemas: 0,
    totalKm: 0,
    totalGanho: 0,
    mediaEntregasPorRota: 0,
  });

  // Filtrar rotas
  useEffect(() => {
    let result = [...routes];

    // Filtro por status
    if (filters.status !== 'all') {
      result = result.filter(r => r.status === filters.status);
    }

    // Filtro por data
    if (filters.startDate) {
      result = result.filter(r => new Date(r.data) >= filters.startDate!);
    }
    if (filters.endDate) {
      const endOfDay = new Date(filters.endDate!);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter(r => new Date(r.data) <= endOfDay);
    }

    // Filtro por busca
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(r => 
        r.nome.toLowerCase().includes(search) ||
        r.waypoints.some((w: any) => w.enderecoNome?.toLowerCase().includes(search))
      );
    }

    // Ordenar por data decrescente
    result.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    setFilteredRoutes(result);
    calculateStats(result);
  }, [routes, filters]);

  const calculateStats = (routesList: HistoryRoute[]) => {
    const concluidas = routesList.filter(r => r.status === 'concluida' || r.status === 'parcial');
    const totalEntregas = concluidas.reduce((sum, r) => sum + (r.metricas?.entregues || 0), 0);
    const totalProblemas = concluidas.reduce((sum, r) => sum + (r.metricas?.problemas || 0), 0);
    const totalKm = concluidas.reduce((sum, r) => sum + (r.metricas?.distanciaTotalKm || 0), 0);
    const totalGanho = concluidas.reduce((sum, r) => sum + (r.metricas?.ganhoEstimado || 0), 0);

    setStats({
      totalRotas: routesList.length,
      totalEntregas,
      totalProblemas,
      totalKm: Math.round(totalKm * 10) / 10,
      totalGanho: Math.round(totalGanho * 100) / 100,
      mediaEntregasPorRota: concluidas.length > 0 ? Math.round((totalEntregas / concluidas.length) * 10) / 10 : 0,
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshRoutes();
    setRefreshing(false);
  };

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: 'all', startDate: null, endDate: null, search: '' });
  };

  const hasActiveFilters = filters.status !== 'all' || filters.startDate || filters.endDate || filters.search;

  const handleExport = async (routeId: string, format: 'pdf' | 'csv') => {
    try {
      setLoading(true);
      if (format === 'pdf') {
        const blob = await apiClient.exportRoutePDF(routeId);
        // Em produção: usar expo-file-system para salvar e compartilhar
        Alert.alert('Sucesso', 'PDF gerado! (Implementar compartilhamento nativo)');
      } else {
        const csv = await apiClient.exportRouteCSV(routeId);
        Alert.alert('Sucesso', 'CSV gerado! (Implementar compartilhamento nativo)');
      }
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Erro', 'Falha ao exportar relatório');
    } finally {
      setLoading(false);
    }
  };

  const handleRoutePress = (route: HistoryRoute) => {
    setSelectedRouteId(route.id);
    router.push(`/route/${route.id}/checklist`);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'concluida': return { color: colors.success, label: 'Concluída', icon: 'check-circle' };
      case 'parcial': return { color: colors.warning, label: 'Parcial', icon: 'alert-circle' };
      case 'cancelada': return { color: colors.danger, label: 'Cancelada', icon: 'close-circle' };
      case 'em_andamento': return { color: colors.primary, label: 'Em Andamento', icon: 'truck' };
      case 'otimizada': return { color: colors.info, label: 'Otimizada', icon: 'map-marker' };
      default: return { color: colors.textSecondary, label: 'Rascunho', icon: 'file-document' };
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (loading || routesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando histórico...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Histórico</Text>
          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
              <Ionicons name="close-circle" size={18} color={colors.primary} />
              <Text style={styles.clearFiltersText}>Limpar filtros</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(!showFilters)}>
          <Ionicons name={showFilters ? 'funnel-outline' : 'funnel'} size={26} color={hasActiveFilters ? colors.primary : colors.textSecondary} />
          {hasActiveFilters && <View style={styles.filterBadge} />}
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsContainer}>
        <TouchableOpacity style={[styles.statCard, { borderLeftColor: colors.primary }]} onPress={() => handleFilterChange('status', 'all')}>
          <View style={styles.statIcon}><Ionicons name="list-outline" size={24} color={colors.primary} /></View>
          <View>
            <Text style={styles.statValue}>{stats.totalRotas}</Text>
            <Text style={styles.statLabel}>Rotas Totais</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statCard, { borderLeftColor: colors.success }]} onPress={() => handleFilterChange('status', 'concluida')}>
          <View style={styles.statIcon}><Ionicons name="check-circle-outline" size={24} color={colors.success} /></View>
          <View>
            <Text style={styles.statValue}>{stats.totalEntregas}</Text>
            <Text style={styles.statLabel}>Entregas</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statCard, { borderLeftColor: colors.warning }]} onPress={() => handleFilterChange('status', 'parcial')}>
          <View style={styles.statIcon}><Ionicons name="alert-circle-outline" size={24} color={colors.warning} /></View>
          <View>
            <Text style={styles.statValue}>{stats.totalProblemas}</Text>
            <Text style={styles.statLabel}>Problemas</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statCard, { borderLeftColor: colors.info }]}>
          <View style={styles.statIcon}><Ionicons name="navigate-outline" size={24} color={colors.info} /></View>
          <View>
            <Text style={styles.statValue}>{stats.totalKm} km</Text>
            <Text style={styles.statLabel}>Distância</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statCard, { borderLeftColor: colors.secondary }]}>
          <View style={styles.statIcon}><Ionicons name="cash-outline" size={24} color={colors.secondary} /></View>
          <View>
            <Text style={styles.statValue}>{formatCurrency(stats.totalGanho)}</Text>
            <Text style={styles.statLabel}>Ganho Total</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Status</Text>
            <View style={styles.filterChips}>
              {(['all', 'concluida', 'parcial', 'cancelada', 'em_andamento'] as const).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.filterChip,
                    filters.status === s && styles.filterChipActive,
                    s !== 'all' && { borderColor: getStatusConfig(s).color }
                  ]}
                  onPress={() => handleFilterChange('status', s)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filters.status === s && styles.filterChipTextActive,
                    s !== 'all' && filters.status === s && { color: getStatusConfig(s).color }
                  ]}>
                    {s === 'all' ? 'Todos' : getStatusConfig(s).label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Período</Text>
            <View style={styles.dateInputs}>
              <TouchableOpacity style={styles.dateInput} onPress={() => { /* Date picker */ }}>
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.dateInputText}>
                  {filters.startDate ? format(filters.startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inicial'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.dateSeparator}>até</Text>
              <TouchableOpacity style={styles.dateInput} onPress={() => { /* Date picker */ }}>
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.dateInputText}>
                  {filters.endDate ? format(filters.endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data final'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Busca</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nome da rota ou endereço..."
              value={filters.search}
              onChangeText={v => handleFilterChange('search', v)}
              onSubmitEditing={() => {}}
            />
          </View>
        </View>
      )}

      {/* Routes List */}
      <FlatList
        data={filteredRoutes}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
        renderItem={({ item }) => {
          const statusConfig = getStatusConfig(item.status);
          const entregues = item.metricas?.entregues || 0;
          const problemas = item.metricas?.problemas || 0;
          const total = item.waypoints.length;

          return (
            <TouchableOpacity style={styles.routeCard} onPress={() => handleRoutePress(item)}>
              <View style={styles.routeCardHeader}>
                <View style={styles.routeStatus}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: statusConfig.color }
                  ]} />
                  <Text style={[styles.routeStatusText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
                <Text style={styles.routeDate}>{formatDate(item.data)}</Text>
              </View>
              <Text style={styles.routeName}>{item.nome}</Text>
              <View style={styles.routeMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.metaText}>{total} paradas</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name={entregues > 0 ? 'check-circle-outline' : 'radio-button-off-outline'} size={16} color={entregues > 0 ? colors.success : colors.textSecondary} />
                  <Text style={styles.metaText}>{entregues} entregues</Text>
                </View>
                {problemas > 0 && (
                  <View style={styles.metaItem}>
                    <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                    <Text style={styles.metaText}>{problemas} problemas</Text>
                  </View>
                )}
                {item.metricas && (
                  <View style={styles.metaItem}>
                    <Ionicons name="navigate-outline" size={16} color={colors.info} />
                    <Text style={styles.metaText}>{item.metricas.distanciaTotalKm.toFixed(1)} km</Text>
                  </View>
                )}
                {item.metricas && item.metricas.ganhoEstimado > 0 && (
                  <View style={styles.metaItem}>
                    <Ionicons name="cash-outline" size={16} color={colors.secondary} />
                    <Text style={styles.metaText}>{formatCurrency(item.metricas.ganhoEstimado)}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.exportBtn}
                onPress={(e) => { e.stopPropagation(); setSelectedRouteId(item.id); setShowExportModal(true); }}
              >
                <Ionicons name="download-outline" size={20} color={colors.primary} />
                <Text style={styles.exportBtnText}>Exportar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {filteredRoutes.length === 0 && routes.length > 0 ? (
              <>
                <Ionicons name="funnel-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>Nenhuma rota encontrada</Text>
                <Text style={styles.emptyText}>Tente ajustar os filtros</Text>
              </>
            ) : (
              <>
                <Ionicons name="time-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>Nenhuma rota no histórico</Text>
                <Text style={styles.emptyText}>Suas rotas concluídas aparecerão aqui</Text>
              </>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Export Modal */}
      <Modal visible={showExportModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Exportar Relatório</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons name="close-outline" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalText}>Escolha o formato do relatório da rota selecionada:</Text>

              <View style={styles.formatOptions}>
                <TouchableOpacity
                  style={[styles.formatOption, exportFormat === 'pdf' && styles.formatOptionActive]}
                  onPress={() => setExportFormat('pdf')}
                >
                  <View style={styles.formatIcon}><Entypo name="doc-text" size={32} color={exportFormat === 'pdf' ? '#FFFFFF' : colors.primary} /></View>
                  <Text style={[styles.formatLabel, exportFormat === 'pdf' && styles.formatLabelActive]}>PDF</Text>
                  <Text style={[styles.formatDesc, exportFormat === 'pdf' && { color: 'rgba(255,255,255,0.8)' }]}>
                    Relatório visual completo com mapa, fotos e assinaturas
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formatOption, exportFormat === 'csv' && styles.formatOptionActive]}
                  onPress={() => setExportFormat('csv')}
                >
                  <View style={styles.formatIcon}><Entypo name="doc-text" size={32} color={exportFormat === 'csv' ? '#FFFFFF' : colors.primary} /></View>
                  <Text style={[styles.formatLabel, exportFormat === 'csv' && styles.formatLabelActive]}>CSV</Text>
                  <Text style={[styles.formatDesc, exportFormat === 'csv' && { color: 'rgba(255,255,255,0.8)' }]}>
                    Dados tabulares para planilhas (Excel, Google Sheets)
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowExportModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={() => handleExport(selectedRouteId!, exportFormat)} disabled={loading}>
                  {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                    <>
                      <Ionicons name="download-outline" size={20} color="#FFFFFF" style={styles.confirmBtnIcon} />
                      <Text style={styles.confirmBtnText}>Gerar {exportFormat.toUpperCase()}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}