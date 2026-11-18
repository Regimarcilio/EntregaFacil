import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface MinIOUploadResult {
  url: string;
  key: string;
  bucket: string;
  size: number;
  contentType: string;
}

export function useMinIO() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload de foto para MinIO via API backend
   */
  const uploadPhoto = useCallback(async (
    fileUri: string,
    metadata: {
      deliveryId: string;
      waypointId: string;
      type: 'foto' | 'assinatura';
      latitude: number;
      longitude: number;
      accuracy: number;
    },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<MinIOUploadResult> => {
    setUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: 0, percentage: 0 });

    try {
      // Primeiro, obtém URL pré-assinada do backend
      const presignedResponse = await apiClient.client.post('/minio/presigned-upload', {
        contentType: 'image/jpeg',
        bucket: 'entregafacil-provas',
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      });

      const { uploadUrl, key, bucket, fields } = presignedResponse.data;

      // Upload direto para MinIO usando URL pré-assinada
      const formData = new FormData();
      
      // Adiciona campos obrigatórios do presigned POST
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      
      // Adiciona o arquivo
      formData.append('file', {
        uri: fileUri,
        type: 'image/jpeg',
        name: `proof_${Date.now()}.jpg`,
      } as any);

      // Faz upload com progresso
      const uploadResponse = await apiClient.client.post(uploadUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
        onUploadProgress: (progressEvent) => {
          const prog: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total || 0,
            percentage: progressEvent.total 
              ? Math.round((progressEvent.loaded / progressEvent.total) * 100)
              : 0,
          };
          setProgress(prog);
          onProgress?.(prog);
        },
      });

      // Verifica se upload foi bem-sucedido (status 204 ou 200/201)
      if (uploadResponse.status >= 200 && uploadResponse.status < 300) {
        const result: MinIOUploadResult = {
          url: `${process.env.EXPO_PUBLIC_MINIO_PUBLIC_URL || 'https://minio.entregafacil.app'}/${bucket}/${key}`,
          key,
          bucket,
          size: progressEvent.total || 0,
          contentType: 'image/jpeg',
        };
        
        setProgress({ loaded: result.size, total: result.size, percentage: 100 });
        return result;
      } else {
        throw new Error(`Upload falhou com status ${uploadResponse.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido no upload';
      setError(message);
      throw new Error(message);
    } finally {
      setUploading(false);
    }
  }, []);

  /**
   * Upload de assinatura (base64) para MinIO
   */
  const uploadSignature = useCallback(async (
    base64: string,
    metadata: {
      deliveryId: string;
      waypointId: string;
    },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<MinIOUploadResult> => {
    setUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: 0, percentage: 0 });

    try {
      // Converte base64 para blob
      const byteString = atob(base64.split(',')[1] || base64);
      const mimeString = base64.split(',')[0]?.split(':')[1]?.split(';')[0] || 'image/png';
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });

      // Obtém URL pré-assinada
      const presignedResponse = await apiClient.client.post('/minio/presigned-upload', {
        contentType: mimeString,
        bucket: 'entregafacil-provas',
        metadata: {
          ...metadata,
          type: 'assinatura',
          timestamp: new Date().toISOString(),
        },
      });

      const { uploadUrl, key, bucket, fields } = presignedResponse.data;

      // Upload
      const formData = new FormData();
      Object.entries(fields).forEach(([k, v]) => formData.append(k, v as string));
      formData.append('file', blob, `signature_${Date.now()}.png`);

      const uploadResponse = await apiClient.client.post(uploadUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
        onUploadProgress: (progressEvent) => {
          const prog: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total || 0,
            percentage: progressEvent.total 
              ? Math.round((progressEvent.loaded / progressEvent.total) * 100)
              : 0,
          };
          setProgress(prog);
          onProgress?.(prog);
        },
      });

      if (uploadResponse.status >= 200 && uploadResponse.status < 300) {
        const result: MinIOUploadResult = {
          url: `${process.env.EXPO_PUBLIC_MINIO_PUBLIC_URL || 'https://minio.entregafacil.app'}/${bucket}/${key}`,
          key,
          bucket,
          size: progressEvent.total || 0,
          contentType: mimeString,
        };
        
        setProgress({ loaded: result.size, total: result.size, percentage: 100 });
        return result;
      } else {
        throw new Error(`Upload falhou com status ${uploadResponse.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido no upload';
      setError(message);
      throw new Error(message);
    } finally {
      setUploading(false);
    }
  }, []);

  /**
   * Deleta arquivo do MinIO
   */
  const deleteFile = useCallback(async (bucket: string, key: string): Promise<void> => {
    try {
      await apiClient.client.delete('/minio/delete', {
        data: { bucket, key },
      });
    } catch (err) {
      console.error('Failed to delete file:', err);
      throw err;
    }
  }, []);

  /**
   * Lista arquivos de uma entrega
   */
  const listDeliveryFiles = useCallback(async (deliveryId: string) => {
    try {
      return await apiClient.client.get('/minio/list', {
        params: { deliveryId },
      });
    } catch (err) {
      console.error('Failed to list files:', err);
      throw err;
    }
  }, []);

  return {
    // State
    uploading,
    progress,
    error,
    
    // Actions
    uploadPhoto,
    uploadSignature,
    deleteFile,
    listDeliveryFiles,
    
    // Reset
    resetProgress: () => setProgress(null),
    resetError: () => setError(null),
  };
}

// Para acessar o client axios interno (necessário para upload direto)
import { apiClient } from '../api/client';