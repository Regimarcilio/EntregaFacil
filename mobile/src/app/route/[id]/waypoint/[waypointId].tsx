'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Modal, Button, ScrollView, Image, Platform } from 'react-native';
import { useAppStore } from '@/shared/store';
import { useRoutes } from '@/shared/hooks/useRoutes';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './waypointStyles';

interface RouteParams {
  id: string;
  waypointId: string;
}

export default function WaypointScreen({ route }: { route: { params: RouteParams } }) {
  const { id, waypointId } = route.params;
  const { routes, updateRoute } = useRoutes();
  const { currentRouteId } = useAppStore();

  const currentRoute = routes.find(r => r.id === id);
  const waypoint = currentRoute?.waypoints.find(w => w.id === waypointId);

  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'entregar' | 'problema' | 'pular' | null>(null);
  const [problemType, setProblemType] = useState<'cliente_ausente' | 'endereco_errado' | 'recusou' | 'outro'>('cliente_ausente');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);

  const canInteract = currentRoute?.status === 'em_andamento' && waypoint?.status === 'em_rota';

  const handleAction = async (action: 'entregar' | 'problema' | 'pular') => {
    if (!waypoint) return;
    
    setSelectedAction(action);
    if (action === 'problema') {
      setShowActionModal(true);
    } else {
      await confirmAction();
    }
  };

  const confirmAction = async () => {
    if (!waypoint || !currentRoute) return;
    
    setLoading(true);
    try {
      let newStatus: string;
      let tipoProblema: string | undefined;
      let obs = observacao;

      if (selectedAction === 'entregar') {
        newStatus = 'entregue';
      } else if (selectedAction === 'problema') {
        newStatus = 'problema';
        tipoProblema = problemType;
      } else if (selectedAction === 'pular') {
        newStatus = 'cancelada';
      } else {
        return;
      }

      const waypoints = currentRoute.waypoints.map(w => {
        if (w.id === waypointId) {
          return { ...w, status: newStatus as any };
        }
        return w;
      });

      await updateRoute(id, { waypoints });
      setShowActionModal(false);
      setObservacao('');
      
      // Navega para comprovação se for entrega
      if (selectedAction === 'entregar') {
        router.push(`/route/${id}/proof/${waypointId}`);
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  if (!currentRoute || !waypoint) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Carregando...</Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#0066CC" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.waypointNumber}>#{currentRoute.waypoints.findIndex(w => w.id === waypointId) + 1}</Text>
          <Text style={styles.waypointName}>{waypoint.enderecoNome || waypoint.nome}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={[
          styles.statusCard,
          { backgroundColor: statusColors[waypoint.status as keyof typeof statusColors] + '15', borderLeftColor: statusColors[waypoint.status as keyof typeof statusColors] }
        ]}>
          <View style={styles.statusRow}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: statusColors[waypoint.status as keyof typeof statusColors] }
            ]}>
              <Ionicons name={statusIcons[waypoint.status as keyof typeof statusIcons]} size={24} color="#FFFFFF" />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>{statusLabels[waypoint.status as keyof typeof statusLabels]}</Text>
              <Text style={styles.statusDescription}>
                {waypoint.status === 'em_rota' ? 'Aguardando ação' :
                 waypoint.status === 'pendente' ? 'Aguardando sua vez' :
                 waypoint.status === 'entregue' ? 'Entrega confirmada' :
                 waypoint.status === 'problema' ? `Problema: ${waypoint.tipoProblema || 'Não especificado'}` :
                 'Entrega cancelada'}
              </Text>
            </View>
          </View>
        </View>

        {/* Endereço */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endereço de Entrega</Text>
          <View style={styles.addressCard}>
            <View style={styles.addressIcon}>
              <MaterialCommunityIcons name="map-marker" size={24} color="#0066CC" />
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressName}>{waypoint.enderecoNome || waypoint.nome}</Text>
              <Text style={styles.addressText}>{waypoint.enderecoFormatado}</Text>
            </View>
          </View>

          {waypoint.destinatario && (
            <View style={styles.destinatarioCard}>
              <View style={styles.destinatarioRow}>
                <MaterialCommunityIcons name="account" size={20} color="#0066CC" />
                <View>
                  <Text style={styles.destinatarioLabel}>Destinatário</Text>
                  <Text style={styles.destinatarioName}>{waypoint.destinatario.nome}</Text>
                </View>
              </View>
              <View style={styles.destinatarioRow}>
                <MaterialCommunityIcons name="phone" size={20} color="#0066CC" />
                <Text style={styles.destinatarioPhone}>{waypoint.destinatario.telefone}</Text>
              </View>
              <View style={styles.destinatarioRow}>
                <MaterialCommunityIcons name="bell-outline" size={20} color="#0066CC" />
                <Text style={styles.destinatarioNotificar}>
                  Notificar: {waypoint.destinatario.notificar === 'sempre' ? 'Sempre' : waypoint.destinatario.notificar === 'apenas_problema' ? 'Apenas problemas' : 'Nunca'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Ações */}
        {canInteract && (
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Ações</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.actionButton, styles.entregarButton]} onPress={() => handleAction('entregar')}>
                <MaterialCommunityIcons name="package-variant-closed" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Entregar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.problemaButton]} onPress={() => handleAction('problema')}>
                <MaterialCommunityIcons name="alert-outline" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Problema</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.pularButton]} onPress={() => handleAction('pular')}>
                <MaterialCommunityIcons name="skip-next" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Pular</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Info quando não pode interagir */}
        {!canInteract && waypoint.status !== 'entregue' && waypoint.status !== 'cancelada' && (
          <View style={styles.waitingCard}>
            <MaterialCommunityIcons name="clock-outline" size={32} color="#94A3B8" />
            <Text style={styles.waitingText}>
              {waypoint.status === 'pendente' ? 'Aguardando sua vez na rota' : 'Ação não disponível no momento'}
            </Text>
          </View>
        )}

        {/* Comprovação se entregue */}
        {waypoint.status === 'entregue' && waypoint.comprovacao && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comprovação de Entrega</Text>
            <View style={styles.proofCard}>
              {waypoint.comprovacao.fotoUrl && (
                <View style={styles.proofPhoto}>
                  <Image source={{ uri: waypoint.comprovacao.fotoUrl }} style={styles.proofImage} />
                </View>
              )}
              <View style={styles.proofDetails}>
                <View style={styles.proofRow}>
                  <MaterialCommunityIcons name="map-marker" size={18} color="#64748B" />
                  <Text style={styles.proofDetail}>
                    GPS: {waypoint.comprovacao.latitude.toFixed(6)}, {waypoint.comprovacao.longitude.toFixed(6)}
                  </Text>
                </View>
                <View style={styles.proofRow}>
                  <MaterialCommunityIcons name="clock" size={18} color="#64748B" />
                  <Text style={styles.proofDetail}>
                    {new Date(waypoint.comprovacao.timestamp).toLocaleString('pt-BR')}
                  </Text>
                </View>
                {waypoint.comprovacao.assinaturaUrl && (
                  <View style={styles.proofRow}>
                    <MaterialCommunityIcons name="signature" size={18} color="#64748B" />
                    <Text style={styles.proofDetail}>Assinatura coletada</Text>
                  </View>
                )}
                {waypoint.comprovacao.observacao && (
                  <View style={styles.proofRow}>
                    <MaterialCommunityIcons name="comment-outline" size={18} color="#64748B" />
                    <Text style={styles.proofDetail}>{waypoint.comprovacao.observacao}</Text>
                  </View>
                )}
              </View>
              {waypoint.whatsappLog && (
                <View style={styles.whatsappStatus}>
                  <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
                  <Text style={styles.whatsappStatusText}>
                    WhatsApp: {waypoint.whatsappLog.status === 'entregue' ? 'Entregue' : waypoint.whatsappLog.status === 'lido' ? 'Lido' : waypoint.whatsappLog.status}
                    {waypoint.whatsappLog.entregueEm && ` às ${new Date(waypoint.whatsappLog.entregueEm).toLocaleTimeString('pt-BR')}`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Problema registrado */}
        {waypoint.status === 'problema' && waypoint.comprovacao && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Problema Registrado</Text>
            <View style={styles.problemCard}>
              <View style={styles.problemRow}>
                <MaterialCommunityIcons name="alert-circle" size={24} color="#F59E0B" />
                <View>
                  <Text style={styles.problemType}>Tipo: {waypoint.comprovacao.tipoProblema || 'Não especificado'}</Text>
                  {waypoint.comprovacao.observacao && (
                    <Text style={styles.problemObs}>{waypoint.comprovacao.observacao}</Text>
                  )}
                </View>
              </View>
              {waypoint.comprovacao.fotoUrl && (
                <Image source={{ uri: waypoint.comprovacao.fotoUrl }} style={styles.problemPhoto} />
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

import { router } from 'expo-router';