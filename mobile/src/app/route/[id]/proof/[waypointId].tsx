'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Modal, Button, ScrollView, StyleSheet, Platform, Image } from 'react-native';
import { Camera } from 'expo-camera';
import { useCameraPermissions } from 'expo-camera';
import { useAppStore } from '@/shared/store';
import { useRoutes } from '@/shared/hooks/useRoutes';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './proofStyles';

interface RouteParams {
  id: string;
  waypointId: string;
}

export default function ProofScreen({ route }: { route: { params: RouteParams } }) {
  const { id, waypointId } = route.params;
  const { routes, updateRoute } = useRoutes();
  const { user } = useAppStore();

  const currentRoute = routes.find(r => r.id === id);
  const waypoint = currentRoute?.waypoints.find(w => w.id === waypointId);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [problemType, setProblemType] = useState<'cliente_ausente' | 'endereco_errado' | 'recusou' | 'outro'>('cliente_ausente');
  const [observacao, setObservacao] = useState('');
  const [photoValid, setPhotoValid] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const cameraRef = useRef<Camera>(null);
  const [cameraType, setCameraType] = useState<Camera.Constants.Type>(Camera.Constants.Type.back);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const validatePhoto = useCallback(async (uri: string) => {
    setValidating(true);
    try {
      // Simula validação de blur + GPS
      // Em produção: usar expo-image-manipulator + ML Kit ou TensorFlow.js
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock GPS accuracy check
      const accuracy = Math.random() * 30 + 5; // 5-35m
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
  }, []);

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
        await validatePhoto(photo.uri);
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
    if (!user) return;

    const timestamp = new Date().toISOString();
    // Em produção: upload para MinIO/S3, calcular hash SHA-256
    const fotoHash = `sha256_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fotoUrl = photoUri; // Temporário, em produção seria URL do CDN

    const comprovacao = {
      id: crypto.randomUUID(),
      waypointId,
      fotoUrl,
      fotoHash,
      latitude: 0, // TODO: pegar GPS real
      longitude: 0,
      accuracy: gpsAccuracy || 0,
      timestamp,
      assinaturaUrl: signature,
      observacao: problemType === 'entregue' ? '' : observacao,
      tipoProblema: problemType !== 'entregue' ? problemType : undefined,
    };

    const waypoints = currentRoute?.waypoints.map(w => 
      w.id === waypointId ? { ...w, status: problemType === 'entregue' ? 'entregue' : 'problema', comprovacao } : w
    ) || [];

    try {
      await updateRoute(id, { waypoints });
      setSuccessMessage(problemType === 'entregue' ? 'Entrega confirmada com sucesso!' : 'Problema registrado com sucesso!');
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar comprovação');
    }
  };

  const handleProblemTypeChange = (type: 'cliente_ausente' | 'endereco_errado' | 'recusou' | 'outro') => {
    setProblemType(type);
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
                    )}
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
                <SignatureCapture
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
        {photoValid && problemType !== 'entregue' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipo de Problema</Text>
            <View style={styles.radioGroup}>
              {(['cliente_ausente', 'endereco_errado', 'recusou', 'outro'] as const).map(opt => (
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
                    {opt === 'cliente_ausente' ? 'Cliente Ausente' : 
                     opt === 'endereco_errado' ? 'Endereço Errado' :
                     opt === 'recusou' ? 'Recusou Recebimento' : 'Outro'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
          </View>
        )}

        {/* Submit Button */}
        {photoValid && (
          <View style={styles.submitContainer}>
            <Button
              title={problemType === 'entregue' ? 'Confirmar Entrega' : 'Registrar Problema'}
              onPress={handleSubmit}
              disabled={loading}
              color={problemType === 'entregue' ? colors.success : colors.warning}
              style={styles.submitButton}
            />
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
    </View>
  );
}

// Imports
import { router } from 'expo-router';
import { Camera } from 'expo-camera';
import { crypto } from 'crypto';

// Signature capture component (simplified - use react-native-signature-canvas in production)
const SignatureCapture = React.forwardRef((props: any, ref: any) => {
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

SignatureCapture.displayName = 'SignatureCapture';