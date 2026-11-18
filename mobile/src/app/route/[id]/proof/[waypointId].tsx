'use client';

import React, { useState, useEffect, useRef, useCallback, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Modal, Button, ScrollView, StyleSheet, Platform, Image, SafeAreaView, TextInput } from 'react-native';
import { Camera } from 'expo-camera';
import { useCameraPermissions } from 'expo-camera';
import { useAppStore } from '@/shared/store';
import { useRoutes } from '@/shared/hooks/useRoutes';
import { Ionicons, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { apiClient } from '@/shared/api/client';
import { useWhatsApp } from '@/shared/hooks/useWhatsApp';
import { useMinIO, UploadProgress } from '@/shared/hooks/useMinIO';
import { useWhatsAppConnectionStatus, useWhatsAppMessageStatus } from '@/shared/hooks/useWhatsAppRealtime';
import { notifyDeliveryConfirmed, notifyDeliveryProblem } from '@/shared/services/notifications';
import { styles } from './proofStyles';
import { colors } from '@/shared/constants/theme';

interface RouteParams {
  id: string;
  waypointId: string;
}

export default function ProofScreen({ route }: { route: { params: RouteParams } }) {
  const { id, waypointId } = route.params;
  const { routes, updateRoute } = useRoutes();
  const { user } = useAppStore();
  const { whatsappConfig } = useAppStore();
  const { 
    sendDeliveryNotification, 
    loading: whatsappLoading,
    connectionStatus 
  } = useWhatsApp();
  const { 
    uploadPhoto, 
    uploadSignature, 
    uploading: minioUploading,
    progress: uploadProgress,
    error: uploadError,
    resetProgress,
    resetError,
  } = useMinIO();

  const currentRoute = routes.find(r => r.id === id);
  const waypoint = currentRoute?.waypoints.find(w => w.id === waypointId);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [problemType, setProblemType] = useState<'entregue' | 'cliente_ausente' | 'endereco_errado' | 'recusou' | 'outro'>('entregue');
  const [observacao, setObservacao] = useState('');
  const [photoValid, setPhotoValid] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [whatsappStatus, setWhatsAppStatus] = useState<'idle' | 'sending' | 'sent' | 'delivered' | 'read' | 'error'>('idle');
  const [whatsappMessageId, setWhatsAppMessageId] = useState<string | null>(null);

  // Realtime WhatsApp status
  const connectionStatus = useWhatsAppConnectionStatus(whatsappConfig?.instanceName);
  const { status: messageStatus, entregueEm, lidoEm, erro } = useWhatsAppMessageStatus(whatsappMessageId);

  const cameraRef = useRef<Camera>(null);
  const signatureRef = useRef<any>(null);
  const [cameraType, setCameraType] = useState<Camera.Constants.Type>(Camera.Constants.Type.back);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Captura GPS ao montar tela
  useEffect(() => {
    (async () => {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          maximumAge: 10000,
          timeout: 10000,
        });
        setGpsLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || 0,
        });
      } catch (error) {
        console.error('GPS error:', error);
      }
    })();
  }, []);

  const validatePhoto = useCallback(async (uri: string) => {
    setValidating(true);
    try {
      // Simula validação de blur + GPS
      // Em produção: usar expo-image-manipulator + ML Kit ou TensorFlow.js
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock GPS accuracy check
      const accuracy = gpsLocation?.accuracy || Math.random() * 30 + 5; // 5-35m
      setGpsAccuracy(accuracy);
      
      if (accuracy <= 50) {
        setPhotoValid(true);
      } else {
        setPhotoValid(false);
        Alert.alert('GPS Impreciso', `Precisão GPS: ${accuracy.toFixed(1)}m. Mova-se para área aberta e tente novamente.`);
      }
    } catch (error) {
      setPhotoValid(false);
    } finally {
      setValidating(false);
    }
  }, [gpsLocation]);

  const takePicture = async () => {
    if (!cameraRef.current || capturing) return;
    
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: true,
        onPictureSaved: () => {},
      });
      
      if (!photo.canceled) {
        setPhotoUri(photo.uri);
        // Valida foto em background
        validatePhoto(photo.uri);
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao capturar foto');
    } finally {
      setCapturing(false);
    }
  };

  const handleSubmit = async () => {
    if (!photoUri || !photoValid) {
      Alert.alert('Erro', 'Foto obrigatória e deve ser válida');
      return;
    }
    if (!gpsLocation) {
      Alert.alert('Erro', 'GPS não disponível. Aguarde a localização.');
      return;
    }
    if (!user) return;

    // Verifica se está offline e enfileira
    const isOnline = useAppStore.getState().isOnline;
    if (!isOnline) {
      // Enfileira para sync posterior
      await enqueueProofForOfflineSync();
      setSuccessMessage('Salvo offline. Será sincronizado quando houver conexão.');
      setShowSuccessModal(true);
      return;
    }

    setLoading(true);
    resetProgress();
    resetError();
    setWhatsAppStatus('idle');

    try {
      // 1. Upload foto para MinIO
      const photoResult = await uploadPhoto(photoUri, {
        deliveryId: id,
        waypointId,
        type: 'foto',
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        accuracy: gpsLocation.accuracy,
      });

      // 2. Upload assinatura se houver
      let signatureUrl: string | undefined;
      if (signature && signature.startsWith('data:image')) {
        const sigResult = await uploadSignature(signature, {
          deliveryId: id,
          waypointId,
        });
        signatureUrl = sigResult.url;
      }

      // 3. Cria entrega completa no backend
      const timestamp = new Date().toISOString();
      const tipoProblema = problemType === 'entregue' ? undefined : problemType;

      const waypoints = currentRoute?.waypoints.map(w => 
        w.id === waypointId ? { 
          ...w, 
          status: problemType === 'entregue' ? 'entregue' : 'problema',
          comprovacao: {
            id: crypto.randomUUID(),
            waypointId,
            fotoUrl: photoResult.url,
            fotoHash: photoResult.key, // Usando key como hash
            latitude: gpsLocation.latitude,
            longitude: gpsLocation.longitude,
            accuracy: gpsLocation.accuracy,
            timestamp: new Date().toISOString(),
            assinaturaUrl: signatureUrl,
            observacao: problemType === 'entregue' ? '' : observacao,
            tipoProblema: tipoProblema,
          },
          whatsappLog: whatsappConfig?.instanceName ? {
            id: crypto.randomUUID(),
            waypointId,
            messageId: '',
            destinatarioNome: waypoint.destinatario?.nome || '',
            telefone: waypoint.destinatario?.telefone || '',
            templateUsado: whatsappConfig.templatePadrao || 'custom',
            status: 'enviado' as const,
            enviadoEm: new Date().toISOString(),
          } : undefined,
        } : w
      ) || [];

      await updateRoute(id, { waypoints });

      // 4. Envia WhatsApp automaticamente se configurado
      if (whatsappConfig?.instanceName && waypoint.destinatario?.telefone && problemType === 'entregue') {
        setWhatsAppStatus('sending');
        try {
          const variables = {
            nome: waypoint.destinatario.nome || 'Cliente',
            endereco: waypoint.enderecoFormatado,
            hora: new Date().toLocaleTimeString('pt-BR'),
            foto: photoResult.url,
            assinatura: signatureUrl || 'não coletada',
          };

          const result = await sendDeliveryNotification(
            whatsappConfig.instanceName,
            waypoint.destinatario.telefone.replace(/\D/g, ''),
            whatsappConfig.templatePadrao || 'entrega_confirmada',
            variables
          );

          // Atualiza whatsappLog com messageId real
          const messageId = result.key?.id || result.messageId || crypto.randomUUID();
          setWhatsAppMessageId(messageId);
          
          // Atualiza localmente
          const updatedWaypoints = waypoints.map(w => 
            w.id === waypointId 
              ? { 
                  ...w, 
                  whatsappLog: {
                    ...w.whatsappLog!,
                    messageId,
                    status: 'enviado' as const,
                    enviadoEm: new Date().toISOString(),
                  }
                }
              : w
          );
          await updateRoute(id, { waypoints: updatedWaypoints });
          
          setWhatsAppStatus('sent');
          
          // Notificação push local de entrega confirmada
          if (problemType === 'entregue') {
            await notifyDeliveryConfirmed(
              waypoint.enderecoNome || waypoint.nome,
              id,
              waypointId
            );
          }
          
          // O status real (entregue/lido) virá via webhook da Evolution API
          // Aqui apenas registramos que foi enviado
        } catch (waError) {
          console.error('WhatsApp send failed:', waError);
          setWhatsAppStatus('error');
          // Não falha a entrega se WhatsApp falhar
        }
      } else if (problemType !== 'entregue') {
        // Notificação push local de problema
        await notifyDeliveryProblem(
          waypoint.enderecoNome || waypoint.nome,
          problemType,
          id,
          waypointId
        );
      }

      setSuccessMessage(problemType === 'entregue' ? 'Entrega confirmada com sucesso!' : 'Problema registrado com sucesso!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Erro', uploadError || 'Falha ao salvar comprovação');
    } finally {
      setLoading(false);
    }
  };

  const enqueueProofForOfflineSync = async () => {
    const operation = {
      type: 'create' as const,
      entity: 'delivery' as const,
      payload: {
        url: '/deliveries',
        method: 'POST',
        data: {
          waypointId,
          fotoUrl: photoUri,
          latitude: gpsLocation?.latitude,
          longitude: gpsLocation?.longitude,
          accuracy: gpsLocation?.accuracy,
          timestamp: new Date().toISOString(),
          observacao,
          tipoProblema: problemType === 'entregue' ? undefined : problemType,
          assinaturaBase64: signature,
        },
      },
    };
    
    useAppStore.getState().enqueue(operation);
    
    // Atualiza localmente para UI imediata
    const waypoints = currentRoute?.waypoints.map(w => 
      w.id === waypointId ? { 
        ...w, 
        status: problemType === 'entregue' ? 'entregue' : 'problema',
        comprovacao: {
          id: crypto.randomUUID(),
          waypointId,
          fotoUrl: photoUri || '',
          fotoHash: 'pending',
          latitude: gpsLocation?.latitude || 0,
          longitude: gpsLocation?.longitude || 0,
          accuracy: gpsLocation?.accuracy || 0,
          timestamp: new Date().toISOString(),
          assinaturaUrl: signature,
          observacao: problemType === 'entregue' ? '' : observacao,
          tipoProblema: problemType === 'entregue' ? undefined : problemType,
        },
      } : w
    ) || [];
    
    await updateRoute(id, { waypoints });
  };

  const handleProblemTypeChange = (type: 'entregue' | 'cliente_ausente' | 'endereco_errado' | 'recusou' | 'outro') => {
    setProblemType(type);
  };

  const getWhatsAppStatusText = (status: string) => {
    switch (status) {
      case 'idle': return 'Aguardando envio';
      case 'sending': return 'Enviando...';
      case 'sent': return 'Enviado ✓';
      case 'delivered': return 'Entregue ✓✓';
      case 'read': return 'Lido ✓✓✓';
      case 'error': return 'Erro no envio';
      default: return status;
    }
  };

  const getWhatsAppStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return colors.textSecondary;
      case 'sending': return colors.primary;
      case 'sent':
      case 'delivered':
      case 'read': return colors.success;
      case 'error': return colors.danger;
      default: return colors.textSecondary;
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

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#94A3B8" />
        <Text style={styles.permissionTitle}>Permissão de Câmera Necessária</Text>
        <Text style={styles.permissionText}>
          Para capturar fotos de comprovação, precisamos acessar sua câmera.
        </Text>
        <Button title="Conceder Permissão" onPress={() => Camera.requestCameraPermissionsAsync()} color="#0066CC" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
        {/* Camera Preview */}
        {hasPermission && (
          <View style={styles.cameraContainer}>
            {photoUri ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photoUri }} style={styles.photoImage} />
                <View style={styles.photoStatus}>
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: photoValid ? colors.success : colors.warning }
                  ]}>
                    <Ionicons name={photoValid ? 'checkmark-circle' : 'time-outline'} size={20} color="#FFFFFF" />
                  </View>
                  <Text style={styles.photoStatusText}>
                    {photoValid ? 'Foto válida ✓' : validating ? 'Validando...' : 'Foto capturada - validando'}
                    {gpsAccuracy !== null && ` • GPS: ${gpsAccuracy.toFixed(1)}m`}
                  </Text>
                </View>
                <TouchableOpacity style={styles.retakeButton} onPress={() => { setPhotoUri(null); setPhotoValid(false); }}>
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.retakeButtonText}>Refazer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cameraView}>
                <Camera
                  ref={cameraRef}
                  style={styles.camera}
                  type={cameraType}
                  ratio="4:3"
                  flashMode={Camera.Constants.FlashMode.auto}
                />
                <View style={styles.cameraOverlay}>
                  <View style={styles.cameraGuide} />
                  <View style={styles.cameraCorners}>
                    {[0, 1, 2, 3].map((_, i) => (
                      <View key={i} style={[styles.corner, { transform: [{ rotate: `${i * 90}deg` }] }]} />
                    ))}
                  </View>
                </View>
                <View style={styles.cameraControls}>
                  <TouchableOpacity style={styles.flashButton} onPress={() => {
                    // Toggle flash
                  }}>
                    <Ionicons name="flash-outline" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.captureButton} onPress={takePicture} disabled={capturing}>
                    <View style={[
                      styles.captureInner,
                      capturing && styles.captureInnerCapturing
                    ]} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.flipButton} onPress={() => {
                    setCameraType(cameraType === Camera.Constants.Type.back 
                      ? Camera.Constants.Type.front 
                      : Camera.Constants.Type.back);
                  }}>
                    <Ionicons name="camera-reverse-outline" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Signature */}
        {photoValid && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Assinatura do Destinatário</Text>
              <TouchableOpacity style={styles.toggleButton} onPress={() => setShowSignature(!showSignature)}>
                <Text style={styles.toggleText}>{showSignature ? 'Ocultar' : 'Adicionar Assinatura'}</Text>
              </TouchableOpacity>
            </View>

            {showSignature && (
              <View style={styles.signatureContainer}>
                <SignatureCanvas
                  ref={signatureRef}
                  onSave={setSignature}
                  onClear={() => setSignature(null)}
                  style={styles.signaturePad}
                  backgroundColor="#FFFFFF"
                  showBorder={true}
                  borderColor={colors.border}
                  borderWidth={1}
                />
              </View>
            )}
          </View>
        )}

        {/* Problem Type */}
        {photoValid && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status da Entrega</Text>
            <View style={styles.radioGroup}>
              {(['entregue', 'cliente_ausente', 'endereco_errado', 'recusou', 'outro'] as const).map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.radioOption,
                    problemType === opt && styles.radioSelected,
                  ]}
                  onPress={() => handleProblemTypeChange(opt)}
                >
                  <View style={[
                    styles.radioCircle,
                    problemType === opt && styles.radioCircleSelected,
                  ]} />
                  <Text style={styles.radioLabel}>
                    {opt === 'entregue' ? '✅ Entregue' : 
                     opt === 'cliente_ausente' ? '👤 Cliente Ausente' : 
                     opt === 'endereco_errado' ? '📍 Endereço Errado' :
                     opt === 'recusou' ? '❌ Recusou Recebimento' : '⚠️ Outro'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {problemType !== 'entregue' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Observação</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={observacao}
                  onChangeText={setObservacao}
                  placeholder="Detalhes do problema..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}
          </View>
        )}

        {/* WhatsApp Status - Real-time */}
        {photoValid && problemType === 'entregue' && whatsappConfig?.instanceName && waypoint.destinatario?.telefone && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Notificação WhatsApp</Text>
              <View style={[
                styles.whatsappStatusBadge,
                { backgroundColor: getWhatsAppStatusColor(messageStatus === 'desconhecido' ? whatsappStatus : messageStatus) }
              ]}>
                <Text style={styles.whatsappStatusText}>
                  {messageStatus !== 'desconhecido' ? getWhatsAppStatusText(messageStatus) : getWhatsAppStatusText(whatsappStatus)}
                </Text>
              </View>
            </View>
            
            <View style={styles.whatsappInfo}>
              <Text style={styles.whatsappInfoLabel}>Destinatário:</Text>
              <Text style={styles.whatsappInfoValue}>
                {waypoint.destinatario.nome} - {waypoint.destinatario.telefone}
              </Text>
              <Text style={styles.whatsappInfoLabel}>Template:</Text>
              <Text style={styles.whatsappInfoValue}>
                {whatsappConfig.templatePadrao || 'personalizado'}
              </Text>
              {whatsappMessageId && (
                <Text style={styles.whatsappInfoLabel}>Message ID:</Text>
                <Text style={styles.whatsappInfoValue} numberOfLines={1}>
                  {whatsappMessageId}
                </Text>
              )}
              {(entregueEm || lidoEm) && (
                <>
                  <Text style={styles.whatsappInfoLabel}>Entregue em:</Text>
                  <Text style={styles.whatsappInfoValue}>
                    {entregueEm ? new Date(entregueEm).toLocaleString('pt-BR') : '—'}
                  </Text>
                  <Text style={styles.whatsappInfoLabel}>Lido em:</Text>
                  <Text style={styles.whatsappInfoValue}>
                    {lidoEm ? new Date(lidoEm).toLocaleString('pt-BR') : '—'}
                  </Text>
                </>
              )}
              {erro && (
                <View style={styles.whatsappError}>
                  <Text style={styles.whatsappInfoLabel}>Erro:</Text>
                  <Text style={styles.whatsappErrorText}>{erro}</Text>
                </View>
              )}
            </View>

            {whatsappStatus === 'error' && (
              <TouchableOpacity style={styles.retryWhatsAppButton} onPress={handleSubmit}>
                <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                <Text style={styles.retryWhatsAppButtonText}>Tentar Reenviar</Text>
              </TouchableOpacity>
            )}

            {/* Connection status indicator */}
            <View style={styles.connectionStatusRow}>
              <View style={[
                styles.connectionDot,
                { backgroundColor: connectionStatus === 'conectado' ? colors.success : 
                                 connectionStatus === 'pareando' ? colors.warning : colors.danger }
              ]} />
              <Text style={styles.connectionStatusText}>
                WhatsApp: {connectionStatus === 'conectado' ? 'Conectado' : 
                          connectionStatus === 'pareando' ? 'Pareando...' : 'Desconectado'}
              </Text>
            </View>
          </View>
        )}

        {/* Upload Progress */}
        {(minioUploading || whatsappLoading) && (
          <View style={styles.progressSection}>
            <Text style={styles.progressTitle}>
              {minioUploading ? 'Enviando arquivos...' : 'Enviando WhatsApp...'}
            </Text>
            {uploadProgress && (
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { width: `${uploadProgress.percentage}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {uploadProgress.percentage}% ({formatBytes(uploadProgress.loaded)}/{formatBytes(uploadProgress.total)})
                </Text>
              </View>
            )}
            {whatsappLoading && !minioUploading && (
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '100%', backgroundColor: colors.primary }]} />
                </View>
                <Text style={styles.progressText}>Enviando notificação...</Text>
              </View>
            )}
          </View>
        )}

        {/* Submit Button */}
        {photoValid && (
          <View style={styles.submitContainer}>
            <Button
              title={problemType === 'entregue' ? 'Confirmar Entrega' : 'Registrar Problema'}
              onPress={handleSubmit}
              disabled={loading || minioUploading || whatsappLoading}
              color={problemType === 'entregue' ? colors.success : colors.warning}
              style={styles.submitButton}
            />
            {(!useAppStore.getState().isOnline) && (
              <Text style={styles.offlineNotice}>
                📴 Modo offline - será sincronizado automaticamente
              </Text>
            )}
          </View>
        )}

        {/* Success Modal */}
        <Modal visible={showSuccessModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={[
                styles.successIcon,
                { backgroundColor: problemType === 'entregue' ? colors.success : colors.warning }
              ]}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.modalTitle}>Sucesso!</Text>
              <Text style={styles.modalText}>{successMessage}</Text>
              <View style={styles.modalButtons}>
                <Button 
                  title="OK" 
                  onPress={() => { setShowSuccessModal(false); router.back(); }}
                  color={problemType === 'entregue' ? colors.success : colors.warning}
                />
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

// Imports
import { router } from 'expo-router';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { crypto } from 'crypto';

// Signature canvas component (usa react-native-signature-canvas em produção)
const SignatureCanvas = React.forwardRef((props: any, ref: any) => {
  const canvasRef = useRef<any>(null);
  
  useImperativeHandle(ref, () => ({
    save: async () => {
      // Em produção: usar react-native-signature-canvas
      // Por enquanto retorna base64 mock
      return 'data:image/png;base64,mock_signature';
    },
    clear: () => {
      // Limpar canvas
    },
  }));
  
  return <View style={props.style} {...props} />;
});

SignatureCanvas.displayName = 'SignatureCanvas';

// Helpers
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};