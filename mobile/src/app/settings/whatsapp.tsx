'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { useAppStore } from '@/shared/store';
import { apiClient } from '@/shared/api/client';
import { styles } from './whatsappStyles';
import { useWhatsApp } from '@/shared/hooks/useWhatsApp';

export default function WhatsAppConfigScreen() {
  const router = useRouter();
  const { user, whatsappConfig, setWhatsAppConfig, updateUser } = useAppStore();
  const { 
    testConnection, 
    pairQR, 
    getTemplates, 
    updateTemplate, 
    sendTestMessage,
    loading,
    connectionStatus,
    templates,
    lastSync
  } = useWhatsApp();

  const [instanceName, setInstanceName] = useState(whatsappConfig?.instanceName || '');
  const [evolutionUrl, setEvolutionUrl] = useState(whatsappConfig?.evolutionUrl || '');
  const [apiKey, setApiKey] = useState(whatsappConfig?.apiKey || '');
  const [remetente, setRemetente] = useState(whatsappConfig?.remetente || 'motorista');
  const [templatePadrao, setTemplatePadrao] = useState(whatsappConfig?.templatePadrao || '');
  const [templateContent, setTemplateContent] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [testNumber, setTestNumber] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    if (whatsappConfig) {
      setInstanceName(whatsappConfig.instanceName);
      setEvolutionUrl(whatsappConfig.evolutionUrl);
      setApiKey(whatsappConfig.apiKey);
      setRemetente(whatsappConfig.remetente);
      setTemplatePadrao(whatsappConfig.templatePadrao);
    }
    
    // Carrega templates se já configurado
    if (whatsappConfig?.instanceName && whatsappConfig?.apiKey) {
      loadTemplates();
      checkConnection();
    }
  }, [whatsappConfig]);

  const loadTemplates = async () => {
    try {
      await getTemplates(instanceName);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  };

  const checkConnection = async () => {
    try {
      await testConnection(instanceName);
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
    }
  };

  const handleSaveConfig = async () => {
    if (!instanceName || !evolutionUrl || !apiKey) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    const config = {
      instanceName,
      evolutionUrl,
      apiKey,
      remetente,
      templatePadrao,
      statusConexao: connectionStatus || 'desconectado',
    };

    setWhatsAppConfig(config);
    
    // Atualiza no backend
    try {
      await updateUser({ whatsappConfig: config });
      Alert.alert('Sucesso', 'Configuração salva com sucesso');
      
      // Carrega templates após salvar
      await loadTemplates();
      await checkConnection();
    } catch (error) {
      console.error('Erro ao salvar config:', error);
      Alert.alert('Erro', 'Falha ao salvar configuração no servidor');
    }
  };

  const handlePairQR = async () => {
    try {
      setShowQrModal(true);
      const result = await pairQR(instanceName);
      if (result?.qrcode) {
        setQrCode(result.qrcode);
        setQrExpiresAt(Date.now() + (result.expiresIn || 60) * 1000);
      }
    } catch (error) {
      console.error('Erro ao gerar QR:', error);
      Alert.alert('Erro', 'Falha ao gerar QR Code');
      setShowQrModal(false);
    }
  };

  const handleTestMessage = async () => {
    if (!testNumber) {
      Alert.alert('Erro', 'Digite um número para teste');
      return;
    }

    if (!templatePadrao) {
      Alert.alert('Erro', 'Selecione um template padrão');
      return;
    }

    try {
      await sendTestMessage(instanceName, testNumber, templatePadrao);
      Alert.alert('Sucesso', 'Mensagem de teste enviada!');
    } catch (error) {
      console.error('Erro ao enviar teste:', error);
      Alert.alert('Erro', 'Falha ao enviar mensagem de teste');
    }
  };

  const handleEditTemplate = (templateName: string) => {
    const template = templates.find(t => t.name === templateName);
    if (template) {
      setEditingTemplate(templateName);
      setTemplateContent(template.content || '');
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    
    try {
      await updateTemplate(instanceName, editingTemplate, templateContent);
      Alert.alert('Sucesso', 'Template atualizado');
      setEditingTemplate(null);
      await loadTemplates();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      Alert.alert('Erro', 'Falha ao atualizar template');
    }
  };

  const handleDeleteConfig = () => {
    Alert.alert(
      'Confirmar',
      'Tem certeza que deseja remover a configuração do WhatsApp?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => {
          setWhatsAppConfig(null);
          updateUser({ whatsappConfig: null });
          setInstanceName('');
          setEvolutionUrl('');
          setApiKey('');
          setRemetente('motorista');
          setTemplatePadrao('');
        }},
      ]
    );
  };

  const formatLastSync = (date: string | null) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleString('pt-BR');
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'conectado': return '#059669';
      case 'pareando': return '#F59E0B';
      case 'desconectado': return '#DC2626';
      default: return '#94A3B8';
    }
  };

  const getConnectionStatusText = (status: string) => {
    switch (status) {
      case 'conectado': return 'Conectado ✓';
      case 'pareando': return 'Pareando...';
      case 'desconectado': return 'Desconectado';
      default: return 'Desconhecido';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#0066CC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WhatsApp</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Status da Conexão */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="whatsapp" size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Status da Conexão</Text>
          </View>
          
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: getConnectionStatusColor(connectionStatus || 'desconectado') }
              ]} />
              <Text style={styles.statusText}>{getConnectionStatusText(connectionStatus || 'desconectado')}</Text>
            </View>
            
            <View style={styles.statusDetails}>
              <Text style={styles.detailLabel}>Instância:</Text>
              <Text style={styles.detailValue}>{instanceName || 'Não configurado'}</Text>
            </View>
            
            <View style={styles.statusDetails}>
              <Text style={styles.detailLabel}>Última verificação:</Text>
              <Text style={styles.detailValue}>{formatLastSync(lastSync)}</Text>
            </View>

            <View style={styles.statusActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.testButton]} 
                onPress={checkConnection}
                disabled={loading || !instanceName}
              >
                <Ionicons name="refresh-outline" size={20} color="#FFFFFF" spin={loading} />
                <Text style={styles.actionButtonText}>Verificar</Text>
              </TouchableOpacity>
              
              {connectionStatus !== 'conectado' && instanceName && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.pairButton]} 
                  onPress={handlePairQR}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="qrcode" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Parear QR</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Configuração */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cog" size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Configuração da Evolution API</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>URL da Evolution API *</Text>
            <TextInput
              style={styles.input}
              value={evolutionUrl}
              onChangeText={setEvolutionUrl}
              placeholder="https://evolution.seudominio.com"
              autoCapitalize="none"
              keyboardType="url"
              autoCompleteType="url"
            />
            <Text style={styles.helpText}>Ex: https://evolution.entregafacil.app</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome da Instância *</Text>
            <TextInput
              style={styles.input}
              value={instanceName}
              onChangeText={setInstanceName}
              placeholder="entregafacil"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helpText}>Nome da instância criada na Evolution API</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>API Key *</Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="sua-api-key"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text style={styles.helpText}>Chave de API da instância (apikey)</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Remetente Padrão</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  remetente === 'motorista' && styles.segmentButtonActive,
                ]}
                onPress={() => setRemetente('motorista')}
              >
                <Text style={[
                  styles.segmentButtonText,
                  remetente === 'motorista' && styles.segmentButtonTextActive,
                ]}>
                  Motorista
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  remetente === 'destinatario' && styles.segmentButtonActive,
                ]}
                onPress={() => setRemetente('destinatario')}
              >
                <Text style={[
                  styles.segmentButtonText,
                  remetente === 'destinatario' && styles.segmentButtonTextActive,
                ]}>
                  Destinatário
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helpText}>
              {remetente === 'motorista' 
                ? 'Mensagens saem do número do motorista (instância)' 
                : 'Mensagens saem do número do destinatário (requer opt-in)'}
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Template Padrão</Text>
            <View style={styles.selectWrapper}>
              <TextInput
                style={styles.input}
                value={templatePadrao}
                onChangeText={setTemplatePadrao}
                placeholder="Selecione um template"
                editable={false}
                onFocus={() => setEditingTemplate('__select__')}
              />
              <Ionicons name="chevron-down-outline" size={24} color="#64748B" style={styles.selectIcon} />
            </View>
            <Text style={styles.helpText}>
              Template usado para notificações automáticas de entrega
            </Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveConfig} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#FFFFFF" style={styles.saveButtonIcon} />
                <Text style={styles.saveButtonText}>Salvar Configuração</Text>
              </>
            )}
          </TouchableOpacity>

          {whatsappConfig && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteConfig}>
              <Ionicons name="trash-outline" size={20} color="#DC2626" style={styles.deleteButtonIcon} />
              <Text style={styles.deleteButtonText}>Remover Configuração</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Templates */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="file-document-outline" size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Templates</Text>
          </View>

          {editingTemplate && editingTemplate !== '__select__' && (
            <View style={styles.templateEditor}>
              <Text style={styles.editorTitle}>Editando: {editingTemplate}</Text>
              <TextInput
                style={styles.templateInput}
                value={templateContent}
                onChangeText={setTemplateContent}
                multiline
                numberOfLines={5}
                placeholder="Conteúdo do template (use {{variavel}} para placeholders)"
              />
              <View style={styles.editorActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingTemplate(null)}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveTemplateButton} onPress={handleSaveTemplate} disabled={loading}>
                  <Text style={styles.saveTemplateButtonText}>Salvar Template</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {templates.length === 0 && !editingTemplate ? (
            <View style={styles.emptyTemplates}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>Nenhum template encontrado</Text>
              <Text style={styles.emptySubtext}>
                Configure a Evolution API e clique em "Verificar" para carregar templates
              </Text>
            </View>
          ) : (
            <View style={styles.templatesList}>
              {templates.map((template) => (
                <View key={template.name} style={styles.templateCard}>
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    <Text style={styles.templateContent} numberOfLines={2}>
                      {template.content?.substring(0, 100)}...
                    </Text>
                    {template.variables && template.variables.length > 0 && (
                      <View style={styles.templateVariables}>
                        {template.variables.map((v: string) => (
                          <Text key={v} style={styles.variableBadge}>{{{v}}}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.editTemplateButton}
                    onPress={() => handleEditTemplate(template.name)}
                  >
                    <Ionicons name="create-outline" size={20} color="#0066CC" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Teste de Envio */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="send-outline" size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Testar Envio</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Número para Teste</Text>
            <TextInput
              style={styles.input}
              value={testNumber}
              onChangeText={setTestNumber}
              placeholder="5511999999999"
              keyboardType="phone-pad"
              autoCompleteType="tel"
            />
            <Text style={styles.helpText}>Formato: 55 + DDD + número (ex: 5511999999999)</Text>
          </View>

          <TouchableOpacity 
            style={styles.testSendButton} 
            onPress={handleTestMessage}
            disabled={loading || !testNumber || !templatePadrao}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="send-outline" size={20} color="#FFFFFF" style={styles.testSendButtonIcon} />
                <Text style={styles.testSendButtonText}>Enviar Mensagem de Teste</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Informações */}
        <View style={styles.infoCard}>
          <Entypo name="help-with-circle" size={24} color="#0066CC" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Como configurar</Text>
            <Text style={styles.infoText}>
              1. Instale a Evolution API no seu servidor (Docker)\n
              2. Crie uma instância e gere a API Key\n
              3. Preencha os campos acima e salve\n
              4. Clique em "Parear QR" e escaneie com o WhatsApp\n
              5. Configure templates na Evolution API ou aqui\n
              6. Teste o envio com um número real
            </Text>
          </View>
        </View>

        {/* Modal QR Code */}
        {showQrModal && qrCode && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>QR Code para Pareamento</Text>
                <TouchableOpacity onPress={() => { setShowQrModal(false); setQrCode(null); }}>
                  <Ionicons name="close-outline" size={28} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.qrContainer}>
                <View style={styles.qrCodeWrapper}>
                  {/* QR Code será renderizado aqui via biblioteca */}
                  <View style={styles.qrPlaceholder}>
                    <MaterialCommunityIcons name="qrcode" size={120} color="#0066CC" />
                    <Text style={styles.qrPlaceholderText}>QR Code</Text>
                    <Text style={styles.qrPlaceholderSubtext}>
                      Integre com react-native-qrcode-svg para exibir
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.qrInstructions}>
                <Text style={styles.instructionTitle}>Como parear:</Text>
                <Text style={styles.instructionText}>
                  1. Abra o WhatsApp no seu celular\n
                  2. Vá em Dispositivos conectados → Conectar aparelho\n
                  3. Escaneie este QR Code\n
                  4. Aguarde a conexão ser estabelecida
                </Text>
              </View>
              
              <TouchableOpacity style={styles.closeModalButton} onPress={() => { setShowQrModal(false); setQrCode(null); }}>
                <Text style={styles.closeModalButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}