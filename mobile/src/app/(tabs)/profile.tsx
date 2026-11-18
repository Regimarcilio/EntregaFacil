'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Modal, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { useAppStore } from '@/shared/store';
import { useRoutes } from '@/shared/hooks/useRoutes';
import { apiClient } from '@/shared/api/client';
import { styles } from './profileStyles';
import { colors, spacing, borderRadius, typography, shadows } from '@/shared/constants/theme';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

interface Motorista {
  id: string;
  nome: string;
  cpfHash: string;
  telefone: string;
  email: string;
  fotoUrl?: string;
  veiculo?: Veiculo;
  preferencias: Preferencias;
  whatsappConfig?: WhatsAppConfig;
  createdAt: string;
  updatedAt: string;
}

interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  cor: string;
  ano: number;
  tipo: 'moto' | 'carro' | 'bike';
  crlvUrl?: string;
}

interface Preferencias {
  tema: 'claro' | 'escuro' | 'sistema';
  unidades: 'metric' | 'imperial';
  vozNavegacao: boolean;
  volumeVoz: number;
  modoLuva: boolean;
  autoIniciarNavegacao: boolean;
  syncApenasWifi: boolean;
  notificacoesPush: boolean;
}

interface WhatsAppConfig {
  evolutionUrl: string;
  apiKey: string;
  instanceName: string;
  remetente: 'motorista' | 'destinatario';
  templatePadrao: string;
  statusConexao: 'conectado' | 'desconectado' | 'pareando';
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateUser, preferences, setPreferences, whatsappConfig, setWhatsAppConfig, token } = useAppStore();
  const { routes, loading: routesLoading } = useRoutes();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  // Vehicle form state
  const [vehicleForm, setVehicleForm] = useState({
    placa: user?.veiculo?.placa || '',
    modelo: user?.veiculo?.modelo || '',
    cor: user?.veiculo?.cor || '',
    ano: user?.veiculo?.ano || new Date().getFullYear(),
    tipo: user?.veiculo?.tipo || 'moto',
    crlvUrl: user?.veiculo?.crlvUrl || '',
  });

  // Stats
  const completedRoutes = routes.filter(r => r.status === 'concluida' || r.status === 'parcial');
  const totalEntregas = completedRoutes.reduce((sum, r) => sum + (r.metricas?.entregues || 0), 0);
  const totalKm = completedRoutes.reduce((sum, r) => sum + (r.metricas?.distanciaTotalKm || 0), 0);
  const totalGanho = completedRoutes.reduce((sum, r) => sum + (r.metricas?.ganhoEstimado || 0), 0);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await apiClient.client.put('/auth/profile', {
        nome: user.nome,
        telefone: user.telefone,
        email: user.email,
      });
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso');
      setEditingField(null);
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('Erro', 'Falha ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVehicle = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const response = await apiClient.client.post('/motoristas/veiculo', vehicleForm);
      updateUser({ veiculo: response });
      Alert.alert('Sucesso', 'Veículo salvo com sucesso');
      setShowVehicleModal(false);
    } catch (error) {
      console.error('Save vehicle error:', error);
      Alert.alert('Erro', 'Falha ao salvar veículo');
    } finally {
      setSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Upload photo
        const formData = new FormData();
        formData.append('file', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'profile.jpg',
        } as any);

        const response = await apiClient.client.post('/motoristas/foto', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        updateUser({ fotoUrl: response.fotoUrl });
        Alert.alert('Sucesso', 'Foto atualizada');
      }
    } catch (error) {
      console.error('Pick photo error:', error);
      Alert.alert('Erro', 'Falha ao atualizar foto');
    }
  };

  const handlePickCRLV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets[0]) {
        const formData = new FormData();
        formData.append('file', {
          uri: result.assets[0].uri,
          type: result.assets[0].mimeType || 'application/pdf',
          name: 'crlv.pdf',
        } as any);

        const response = await apiClient.client.post('/motoristas/crlv', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setVehicleForm(prev => ({ ...prev, crlvUrl: response.crlvUrl }));
        Alert.alert('Sucesso', 'CRLV anexado');
      }
    } catch (error) {
      console.error('Pick CRLV error:', error);
      Alert.alert('Erro', 'Falha ao anexar CRLV');
    }
  };

  const handlePreferenceChange = (key: keyof Preferencias, value: any) => {
    setPreferences({ [key]: value });
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      // Store logout já limpa tudo
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDeleteAccount = async () => {
    setShowDeleteAccount(false);
    Alert.alert(
      'Confirmar Exclusão',
      'Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive', 
          onPress: async () => {
            setLoading(true);
            try {
              await apiClient.client.delete('/auth/account');
              // App will logout automatically
            } catch (error) {
              console.error('Delete account error:', error);
              Alert.alert('Erro', 'Falha ao excluir conta');
            } finally {
              setLoading(false);
            }
          }
        },
      ]
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getVehicleIcon = (tipo: string) => {
    switch (tipo) {
      case 'moto': return 'motorcycle';
      case 'carro': return 'car';
      case 'bike': return 'bicycle';
      default: return 'motorcycle';
    }
  };

  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (!user || !editingField) return;
    const updates: Partial<Motorista> = { [editingField]: editValue };
    updateUser(updates);
    handleSaveProfile();
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={async () => { /* refresh */ }}
          colors={[colors.primary]}
        />
      }>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user.fotoUrl ? (
              <Image source={{ uri: user.fotoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.avatarInitials}>
                  {user.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.avatarEditBtn} onPress={handlePickPhoto}>
              <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.nome}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <Text style={styles.profilePhone}>{user.telefone}</Text>
            <View style={styles.memberSince}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.memberSinceText}>
                Membro desde {new Date(user.createdAt).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{completedRoutes.length}</Text>
            <Text style={styles.statLabel}>Rotas Concluídas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalEntregas}</Text>
            <Text style={styles.statLabel}>Entregas Realizadas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalKm.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Km Percorridos</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{formatCurrency(totalGanho)}</Text>
            <Text style={styles.statLabel}>Ganho Total</Text>
          </View>
        </View>

        {/* Vehicle Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Veículo</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => setShowVehicleModal(true)}>
              <Ionicons name={user.veiculo ? 'create-outline' : 'add-outline'} size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {user.veiculo ? (
            <View style={styles.vehicleCard}>
              <View style={styles.vehicleIcon}>
                <MaterialCommunityIcons name={getVehicleIcon(user.veiculo.tipo)} size={32} color={colors.primary} />
              </View>
              <View style={styles.vehicleDetails}>
                <Text style={styles.vehiclePlate}>{user.veiculo.placa.toUpperCase()}</Text>
                <Text style={styles.vehicleModel}>{user.veiculo.modelo} • {user.veiculo.cor} • {user.veiculo.ano}</Text>
                <Text style={styles.vehicleType}>
                  <MaterialCommunityIcons name={getVehicleIcon(user.veiculo.tipo)} size={14} color={colors.textSecondary} />
                  {user.veiculo.tipo.charAt(0).toUpperCase() + user.veiculo.tipo.slice(1)}
                </Text>
              </View>
              {user.veiculo.crlvUrl && (
                <View style={styles.crlvBadge}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
                  <Text style={styles.crlvText}>CRLV Verificado</Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity style={styles.addVehicleBtn} onPress={() => setShowVehicleModal(true)}>
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              <Text style={styles.addVehicleText}>Adicionar Veículo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferências</Text>
          
          <View style={styles.prefItem}>
            <View style={styles.prefInfo}>
              <Ionicons name="color-palette-outline" size={22} color={colors.primary} style={styles.prefIcon} />
              <View>
                <Text style={styles.prefLabel}>Tema</Text>
                <Text style={styles.prefDesc}>Aparência do aplicativo</Text>
              </View>
            </View>
            <View style={styles.prefControl}>
              {(['claro', 'escuro', 'sistema'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.themeOption,
                    preferences.tema === t && styles.themeOptionActive,
                  ]}
                  onPress={() => handlePreferenceChange('tema', t)}
                >
                  <Text style={[
                    styles.themeOptionText,
                    preferences.tema === t && styles.themeOptionTextActive,
                  ]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.prefItem}>
            <View style={styles.prefInfo}>
              <Ionicons name="navigate-outline" size={22} color={colors.primary} style={styles.prefIcon} />
              <View>
                <Text style={styles.prefLabel}>Unidades</Text>
                <Text style={styles.prefDesc}>Sistema de medidas</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.segmentedControl, preferences.unidades === 'metric' && styles.segmentedActive]} onPress={() => handlePreferenceChange('unidades', 'metric')}>
              <Text style={[styles.segmentText, preferences.unidades === 'metric' && styles.segmentTextActive]}>Métrico</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.segmentedControl, preferences.unidades === 'imperial' && styles.segmentedActive]} onPress={() => handlePreferenceChange('unidades', 'imperial')}>
              <Text style={[styles.segmentText, preferences.unidades === 'imperial' && styles.segmentTextActive]}>Imperial</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.prefItem}>
            <View style={styles.prefInfo}>
              <Ionicons name="volume-high-outline" size={22} color={colors.primary} style={styles.prefIcon} />
              <View>
                <Text style={styles.prefLabel}>Voz na Navegação</Text>
                <Text style={styles.prefDesc}>Instruções de voz durante rotas</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.toggleSwitch} onPress={() => handlePreferenceChange('vozNavegacao', !preferences.vozNavegacao)}>
              <View style={[
                styles.toggleTrack,
                preferences.vozNavegacao && styles.toggleTrackActive,
              ]}>
                <View style={[
                  styles.toggleThumb,
                  preferences.vozNavegacao && styles.toggleThumbActive,
                ]} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.prefItem}>
            <View style={styles.prefInfo}>
              <Ionicons name="volume-high-outline" size={22} color={colors.primary} style={styles.prefIcon} />
              <View>
                <Text style={styles.prefLabel}>Volume da Voz</Text>
                <Text style={styles.prefDesc}>{preferences.volumeVoz}%</Text>
              </View>
            </View>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderMin}>0%</Text>
              <View style={styles.sliderTrack}>
                <View style={[
                  styles.sliderFill,
                  { width: `${preferences.volumeVoz}%` }
                ]} />
                <View style={[
                  styles.sliderThumb,
                  { left: `${preferences.volumeVoz}%` }
                ]} />
              </View>
              <Text style={styles.sliderMax}>100%</Text>
            </View>
          </View>

          <View style={styles.prefItem}>
            <View style={styles.prefInfo}>
              <Ionicons name="hand-left-outline" size={22} color={colors.primary} style={styles.prefIcon} />
              <View>
                <Text style={styles.prefLabel}>Modo Luva</Text>
                <Text style={styles.prefDesc}>Aumenta áreas de toque para uso com luvas</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.toggleSwitch} onPress={() => handlePreferenceChange('modoLuva', !preferences.modoLuva)}>
              <View style={[
                styles.toggleTrack,
                preferences.modoLuva && styles.toggleTrackActive,
              ]}>
                <View style={[
                  styles.toggleThumb,
                  preferences.modoLuva && styles.toggleThumbActive,
                ]} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.prefItem}>
            <View style={styles.prefInfo}>
              <Ionicons name="play-outline" size={22} color={colors.primary} style={styles.prefIcon} />
              <View>
                <Text style={styles.prefLabel}>Auto Iniciar Navegação</Text>
                <Text style={styles.prefDesc}>Inicia navegação automaticamente ao começar rota</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.toggleSwitch} onPress={() => handlePreferenceChange('autoIniciarNavegacao', !preferences.autoIniciarNavegacao)}>
              <View style={[
                styles.toggleTrack,
                preferences.autoIniciarNavegacao && styles.toggleTrackActive,
              ]}>
                <View style={[
                  styles.toggleThumb,
                  preferences.autoIniciarNavegacao && styles.toggleThumbActive,
                ]} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.prefItem}>
            <View style={styles.prefInfo}>
              <Ionicons name="wifi-outline" size={22} color={colors.primary} style={styles.prefIcon} />
              <View>
                <Text style={styles.prefLabel}>Sync Apenas no Wi-Fi</Text>
                <Text style={styles.prefDesc}>Economiza dados móveis</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.toggleSwitch} onPress={() => handlePreferenceChange('syncApenasWifi', !preferences.syncApenasWifi)}>
              <View style={[
                styles.toggleTrack,
                preferences.syncApenasWifi && styles.toggleTrackActive,
              ]}>
                <View style={[
                  styles.toggleThumb,
                  preferences.syncApenasWifi && styles.toggleThumbActive,
                ]} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.prefItem}>
            <View style={styles.prefInfo}>
              <Ionicons name="notifications-outline" size={22} color={colors.primary} style={styles.prefIcon} />
              <View>
                <Text style={styles.prefLabel}>Notificações Push</Text>
                <Text style={styles.prefDesc}>Alertas de rota, entregas e sincronização</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.toggleSwitch} onPress={() => handlePreferenceChange('notificacoesPush', !preferences.notificacoesPush)}>
              <View style={[
                styles.toggleTrack,
                preferences.notificacoesPush && styles.toggleTrackActive,
              ]}>
                <View style={[
                  styles.toggleThumb,
                  preferences.notificacoesPush && styles.toggleThumbActive,
                ]} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>

          <TouchableOpacity style={styles.accountItem} onPress={() => startEditing('nome', user.nome)}>
            <Ionicons name="person-outline" size={22} color={colors.primary} style={styles.accountIcon} />
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>Nome</Text>
              <Text style={styles.accountValue}>{user.nome}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.accountItem} onPress={() => startEditing('telefone', user.telefone)}>
            <Ionicons name="call-outline" size={22} color={colors.primary} style={styles.accountIcon} />
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>Telefone</Text>
              <Text style={styles.accountValue}>{user.telefone}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.accountItem} onPress={() => startEditing('email', user.email)}>
            <Ionicons name="mail-outline" size={22} color={colors.primary} style={styles.accountIcon} />
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>E-mail</Text>
              <Text style={styles.accountValue}>{user.email}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.accountItem} onPress={() => router.push('/settings/whatsapp')}>
            <Ionicons name="logo-whatsapp" size={22} color="#25D366" style={styles.accountIcon} />
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>WhatsApp</Text>
              <Text style={styles.accountValue}>
                {whatsappConfig?.statusConexao === 'conectado' ? 'Conectado' : 'Não configurado'}
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.accountItem} onPress={() => router.push('/settings/offline-maps')}>
            <Ionicons name="map-outline" size={22} color={colors.primary} style={styles.accountIcon} />
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>Mapas Offline</Text>
              <Text style={styles.accountValue}>Gerenciar downloads</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerItem} onPress={() => setShowLogoutConfirm(true)}>
            <Ionicons name="log-out-outline" size={22} color={colors.danger} style={styles.accountIcon} />
            <View style={styles.accountInfo}>
              <Text style={[styles.accountLabel, { color: colors.danger }]}>Sair da Conta</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerItem} onPress={() => setShowDeleteAccount(true)}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} style={styles.accountIcon} />
            <View style={styles.accountInfo}>
              <Text style={[styles.accountLabel, { color: colors.danger }]}>Excluir Conta</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>EntregaFácil v1.0.0</Text>
          <Text style={styles.appBuild}>Build 1 • Expo SDK 51</Text>
          <Text style={styles.appLegal}>© 2024 EntregaFácil. Todos os direitos reservados.</Text>
        </View>
      </ScrollView>

      {/* Edit Field Modal */}
      {editingField && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar {editingField === 'nome' ? 'Nome' : editingField === 'telefone' ? 'Telefone' : 'E-mail'}</Text>
                <TouchableOpacity onPress={() => setEditingField(null)}>
                  <Ionicons name="close-outline" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.modalInput}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={editingField === 'nome' ? 'Seu nome' : editingField === 'telefone' ? '5511999999999' : 'seu@email.com'}
                keyboardType={editingField === 'telefone' ? 'phone-pad' : 'default'}
                autoCapitalize={editingField === 'nome' ? 'words' : 'none'}
                autoComplete={editingField === 'telefone' ? 'tel' : editingField === 'email' ? 'email' : 'name'}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingField(null)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={saveEdit} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.confirmBtnText}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Vehicle Modal */}
      {showVehicleModal && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '85%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{user.veiculo ? 'Editar Veículo' : 'Adicionar Veículo'}</Text>
                <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
                  <Ionicons name="close-outline" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Placa *</Text>
                  <TextInput
                    style={styles.input}
                    value={vehicleForm.placa}
                    onChangeText={v => setVehicleForm(prev => ({ ...prev, placa: v.toUpperCase() }))}
                    placeholder="ABC1D23"
                    autoCapitalize="characters"
                    maxLength={7}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Modelo *</Text>
                  <TextInput
                    style={styles.input}
                    value={vehicleForm.modelo}
                    onChangeText={v => setVehicleForm(prev => ({ ...prev, modelo: v }))}
                    placeholder="Ex: Honda CG 160"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Cor *</Text>
                  <TextInput
                    style={styles.input}
                    value={vehicleForm.cor}
                    onChangeText={v => setVehicleForm(prev => ({ ...prev, cor: v }))}
                    placeholder="Ex: Preto"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Ano *</Text>
                  <TextInput
                    style={styles.input}
                    value={vehicleForm.ano.toString()}
                    onChangeText={v => setVehicleForm(prev => ({ ...prev, ano: parseInt(v) || new Date().getFullYear() }))}
                    placeholder={new Date().getFullYear().toString()}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Tipo *</Text>
                  <View style={styles.segmentedControl}>
                    {(['moto', 'carro', 'bike'] as const).map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.segmentOption,
                          vehicleForm.tipo === t && styles.segmentOptionActive,
                        ]}
                        onPress={() => setVehicleForm(prev => ({ ...prev, tipo: t }))}
                      >
                        <MaterialCommunityIcons name={getVehicleIcon(t)} size={20} color={vehicleForm.tipo === t ? '#FFFFFF' : colors.primary} />
                        <Text style={[
                          styles.segmentOptionText,
                          vehicleForm.tipo === t && styles.segmentOptionTextActive,
                        ]}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>CRLV (PDF ou Imagem)</Text>
                  {vehicleForm.crlvUrl ? (
                    <View style={styles.fileAttached}>
                      <Ionicons name="document-text-outline" size={24} color={colors.success} />
                      <Text style={styles.fileAttachedText}>CRLV anexado</Text>
                      <TouchableOpacity style={styles.removeFileBtn} onPress={() => setVehicleForm(prev => ({ ...prev, crlvUrl: '' }))}>
                        <Ionicons name="close-outline" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.attachFileBtn} onPress={handlePickCRLV}>
                      <Ionicons name="attach-outline" size={24} color={colors.primary} />
                      <Text style={styles.attachFileText}>Anexar CRLV</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowVehicleModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveVehicle} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.confirmBtnText}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sair da Conta</Text>
              </View>
              <Text style={styles.modalText}>Tem certeza que deseja sair? Você precisará fazer login novamente.</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLogoutConfirm(false)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.danger }]} onPress={handleLogout}>
                  <Text style={styles.confirmBtnText}>Sair</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// Import RefreshControl
import { RefreshControl } from 'react-native';