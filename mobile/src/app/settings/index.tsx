'use client';

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch, Modal, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Entypo, MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '@/shared/store';
import { apiClient } from '@/shared/api/client';
import { styles } from './settingsStyles';
import { colors, spacing, borderRadius, typography, shadows } from '@/shared/constants/theme';
import { useNotifications } from '@/shared/hooks/useNotifications';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const router = useRouter();
  const { 
    user, 
    preferences, 
    setPreferences, 
    whatsappConfig, 
    isOnline, 
    lastSyncAt,
    logout 
  } = useAppStore();
  
  const { 
    notifySyncComplete, 
    scheduleBackgroundSync, 
    cancelAll 
  } = useNotifications();

  const [loading, setLoading] = useState(false);
  const [showClearCache, setShowClearCache] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 0 });
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [buildNumber, setBuildNumber] = useState('1');

  useEffect(() => {
    loadAppInfo();
    loadStorageInfo();
  }, []);

  const loadAppInfo = async () => {
    try {
      const version = Application.nativeApplicationVersion || '1.0.0';
      const build = Application.nativeBuildVersion || '1';
      setAppVersion(version);
      setBuildNumber(build);
    } catch (error) {
      console.error('Failed to load app info:', error);
    }
  };

  const loadStorageInfo = async () => {
    try {
      // Em produção: usar expo-file-system para calcular uso real
      setStorageInfo({ used: 245, total: 1024 }); // Mock: 245MB usado de 1GB
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  };

  const handlePreferenceChange = (key: keyof typeof preferences, value: any) => {
    setPreferences({ [key]: value });
  };

  const handleClearCache = async () => {
    setShowClearCache(false);
    Alert.alert(
      'Limpar Cache',
      'Isso removerá arquivos temporários e cache de imagens. Dados offline (rotas, endereços, mapas) NÃO serão afetados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Limpar', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Em produção: usar expo-file-system para limpar cache
              await new Promise(resolve => setTimeout(resolve, 1000));
              loadStorageInfo();
              Alert.alert('Sucesso', 'Cache limpo com sucesso');
            } catch (error) {
              console.error('Clear cache error:', error);
              Alert.alert('Erro', 'Falha ao limpar cache');
            } finally {
              setLoading(false);
            }
          }
        },
      ]
    );
  };

  const handleResetPreferences = () => {
    Alert.alert(
      'Restaurar Padrões',
      'Todas as preferências voltarão aos valores padrão. Tem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Restaurar', 
          style: 'destructive',
          onPress: () => {
            setPreferences({
              tema: 'sistema',
              unidades: 'metric',
              vozNavegacao: true,
              volumeVoz: 80,
              modoLuva: false,
              autoIniciarNavegacao: true,
              syncApenasWifi: true,
              notificacoesPush: true,
            });
            Alert.alert('Sucesso', 'Preferências restauradas');
          }
        },
      ]
    );
  };

  const handleForceSync = async () => {
    setLoading(true);
    try {
      await apiClient.forceSync();
      notifySyncComplete(true);
      Alert.alert('Sucesso', 'Sincronização forçada concluída');
    } catch (error) {
      console.error('Force sync error:', error);
      notifySyncComplete(false, error instanceof Error ? error.message : 'Erro desconhecido');
      Alert.alert('Erro', 'Falha na sincronização');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja sair? Você precisará fazer login novamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };

  const formatLastSync = (date: string | null) => {
    if (!date) return 'Nunca';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Account Section */}
        {user && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Conta</Text>
            </View>
            <View style={styles.accountCard}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{user.nome}</Text>
                <Text style={styles.accountEmail}>{user.email}</Text>
              </View>
              <TouchableOpacity style={styles.accountArrow} onPress={() => router.push('/profile')}>
                <Ionicons name="chevron-forward-outline" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings/whatsapp')}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>WhatsApp</Text>
                <Text style={styles.menuValue}>
                  {whatsappConfig?.statusConexao === 'conectado' ? 'Conectado' : 'Configurar'}
                </Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Preferências</Text>
          </View>

          {/* Tema */}
          <View style={styles.prefCard}>
            <View style={styles.prefHeader}>
              <Ionicons name="color-palette-outline" size={24} color={colors.primary} style={styles.prefIcon} />
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

          {/* Unidades */}
          <View style={styles.prefCard}>
            <View style={styles.prefHeader}>
              <Ionicons name="navigate-outline" size={24} color={colors.primary} style={styles.prefIcon} />
              <View>
                <Text style={styles.prefLabel}>Unidades</Text>
                <Text style={styles.prefDesc}>Sistema de medidas</Text>
              </View>
            </View>
            <View style={styles.segmentedControl}>
              <TouchableOpacity 
                style={[styles.segmentOption, preferences.unidades === 'metric' && styles.segmentOptionActive]} 
                onPress={() => handlePreferenceChange('unidades', 'metric')}
              >
                <Text style={[styles.segmentText, preferences.unidades === 'metric' && styles.segmentTextActive]}>Métrico (km)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.segmentOption, preferences.unidades === 'imperial' && styles.segmentOptionActive]} 
                onPress={() => handlePreferenceChange('unidades', 'imperial')}
              >
                <Text style={[styles.segmentText, preferences.unidades === 'imperial' && styles.segmentTextActive]}>Imperial (mi)</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Navegação */}
          <View style={styles.prefCard}>
            <View style={styles.prefHeader}>
              <Ionicons name="navigate-outline" size={24} color={colors.primary} style={styles.prefIcon} />
              <View>
                <Text style={styles.prefLabel}>Navegação</Text>
                <Text style={styles.prefDesc}>Configurações de voz e auto-início</Text>
              </View>
            </View>
            
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Voz na Navegação</Text>
                <Text style={styles.toggleDesc}>Instruções de voz durante rotas</Text>
              </View>
              <Switch
                value={preferences.vozNavegacao}
                onValueChange={v => handlePreferenceChange('vozNavegacao', v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={preferences.vozNavegacao ? colors.primary : '#fff'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Volume da Voz</Text>
                <Text style={styles.toggleDesc}>{preferences.volumeVoz}%</Text>
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

            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Auto Iniciar Navegação</Text>
                <Text style={styles.toggleDesc}>Inicia automaticamente ao começar rota</Text>
              </View>
              <Switch
                value={preferences.autoIniciarNavegacao}
                onValueChange={v => handlePreferenceChange('autoIniciarNavegacao', v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={preferences.autoIniciarNavegacao ? colors.primary : '#fff'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Modo Luva</Text>
                <Text style={styles.toggleDesc}>Aumenta áreas de toque para uso com luvas</Text>
              </View>
              <Switch
                value={preferences.modoLuva}
                onValueChange={v => handlePreferenceChange('modoLuva', v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={preferences.modoLuva ? colors.primary : '#fff'}
              />
            </View>
          </View>

          {/* Sincronização */}
          <View style={styles.prefCard}>
            <View style={styles.prefHeader}>
              <Ionicons name="sync-outline" size={24} color={colors.primary} style={styles.prefIcon} />
              <View>
                <Text style={styles.prefLabel}>Sincronização</Text>
                <Text style={styles.prefDesc}>Controle de dados e conectividade</Text>
              </View>
            </View>

            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Sync Apenas no Wi-Fi</Text>
                <Text style={styles.toggleDesc}>Economiza dados móveis</Text>
              </View>
              <Switch
                value={preferences.syncApenasWifi}
                onValueChange={v => handlePreferenceChange('syncApenasWifi', v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={preferences.syncApenasWifi ? colors.primary : '#fff'}
              />
            </View>

            <TouchableOpacity style={styles.syncInfoRow} onPress={handleForceSync} disabled={loading || !isOnline}>
              <Ionicons name="refresh-outline" size={24} color={colors.primary} style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Sincronizar Agora</Text>
                <Text style={styles.menuValue}>
                  Último: {formatLastSync(lastSyncAt)}
                </Text>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward-outline" size={22} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            <View style={styles.syncStatus}>
              <View style={[
                styles.statusDot,
                { backgroundColor: isOnline ? colors.success : colors.danger }
              ]} />
              <Text style={styles.syncStatusText}>
                {isOnline ? 'Online - Sincronização ativa' : 'Offline - Dados salvos localmente'}
              </Text>
            </View>
          </View>

          {/* Notificações */}
          <View style={styles.prefCard}>
            <View style={styles.prefHeader}>
              <Ionicons name="notifications-outline" size={24} color={colors.primary} style={styles.prefIcon} />
              <View>
                <Text style={styles.prefLabel}>Notificações</Text>
                <Text style={styles.prefDesc}>Alertas e lembretes</Text>
              </View>
            </View>

            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Notificações Push</Text>
                <Text style={styles.toggleDesc}>Receber alertas de rota, entregas e sync</Text>
              </View>
              <Switch
                value={preferences.notificacoesPush}
                onValueChange={async (v) => {
                  handlePreferenceChange('notificacoesPush', v);
                  if (v) await scheduleBackgroundSync();
                  else await cancelAll();
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={preferences.notificacoesPush ? colors.primary : '#fff'}
              />
            </View>
          </View>

          {/* Armazenamento */}
          <View style={styles.prefCard}>
            <View style={styles.prefHeader}>
              <Ionicons name="folder-outline" size={24} color={colors.primary} style={styles.prefIcon} />
              <View>
                <Text style={styles.prefLabel}>Armazenamento</Text>
                <Text style={styles.prefDesc}>{formatBytes(storageInfo.used * 1024 * 1024)} de {formatBytes(storageInfo.total * 1024 * 1024)} usados</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={handleClearCache}>
              <Ionicons name="trash-outline" size={24} color={colors.warning} style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Limpar Cache</Text>
                <Text style={styles.menuValue}>Remove arquivos temporários</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings/offline-maps')}>
              <Ionicons name="map-outline" size={24} color={colors.info} style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Mapas Offline</Text>
                <Text style={styles.menuValue}>Gerenciar downloads de regiões</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Acessibilidade */}
          <View style={styles.prefCard}>
            <View style={styles.prefHeader}>
              <Ionicons name="accessibility-outline" size={24} color={colors.primary} style={styles.prefIcon} />
              <View>
                <Text style={styles.prefLabel}>Acessibilidade</Text>
                <Text style={styles.prefDesc}>Recursos de inclusão</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={() => { /* Abrir config do sistema */ }}>
              <Ionicons name="settings-outline" size={24} color={colors.primary} style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Configurações do Sistema</Text>
                <Text style={styles.menuValue}>Tamanho da fonte, alto contraste, etc.</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Advanced Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Avançado</Text>
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={handleResetPreferences}>
            <Ionicons name="refresh-outline" size={24} color={colors.warning} style={styles.menuIcon} />
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Restaurar Preferências</Text>
              <Text style={styles.menuValue}>Voltar aos valores padrão</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setShowAbout(true)}>
            <Ionicons name="information-circle-outline" size={24} color={colors.info} style={styles.menuIcon} />
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Sobre o App</Text>
              <Text style={styles.menuValue}>Versão, licenças e informações legais</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Zona de Perigo</Text>
          </View>

          <TouchableOpacity style={[styles.menuItem, styles.dangerItem]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={colors.danger} style={styles.menuIcon} />
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, { color: colors.danger }]}>Sair da Conta</Text>
              <Text style={styles.menuValue}>Você precisará fazer login novamente</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info Footer */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>EntregaFácil</Text>
          <Text style={styles.appVersion}>Versão {appVersion} • Build {buildNumber}</Text>
          <Text style={styles.appBuild}>Expo SDK {Constants.expoConfig?.sdkVersion || '51'} • React Native 0.74</Text>
          <Text style={styles.appLegal}>© 2024 EntregaFácil. Todos os direitos reservados.</Text>
          <Text style={styles.appLegal}>LGPD • Termos de Uso • Política de Privacidade</Text>
        </View>
      </ScrollView>

      {/* About Modal */}
      {showAbout && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sobre o EntregaFácil</Text>
                <TouchableOpacity onPress={() => setShowAbout(false)}>
                  <Ionicons name="close-outline" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.modalBody}>
                <View style={styles.aboutSection}>
                  <Text style={styles.aboutTitle}>Versão {appVersion} (Build {buildNumber})</Text>
                  <Text style={styles.aboutText}>
                    Aplicativo para motoristas de entrega otimizar rotas, capturar comprovações e notificar clientes via WhatsApp.
                  </Text>
                </View>

                <View style={styles.aboutSection}>
                  <Text style={styles.aboutTitle}>Tecnologias</Text>
                  <Text style={styles.aboutText}>
                    React Native • Expo • TypeScript • MapLibre • Node.js/Hono • PostgreSQL/PostGIS • MinIO • Evolution API
                  </Text>
                </View>

                <View style={styles.aboutSection}>
                  <Text style={styles.aboutTitle}>Licenças Open Source</Text>
                  <Text style={styles.aboutText}>
                    Este app usa software de código aberto. Lista completa disponível em:<br/>
                    <Text style={{ color: colors.primary }}>github.com/entregafacil/mobile/LICENSES.md</Text>
                  </Text>
                </View>

                <View style={styles.aboutSection}>
                  <Text style={styles.aboutTitle}>Privacidade & LGPD</Text>
                  <Text style={styles.aboutText}>
                    Seus dados são criptografados e nunca vendidos. Veja nossa política completa em:<br/>
                    <Text style={{ color: colors.primary }}>entregafacil.app/privacidade</Text>
                  </Text>
                </View>

                <View style={styles.aboutSection}>
                  <Text style={styles.aboutTitle}>Suporte</Text>
                  <Text style={styles.aboutText}>
                    Email: suporte@entregafacil.app<br/>
                    WhatsApp: +55 11 99999-9999
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// Import Switch
import { Switch } from 'react-native';