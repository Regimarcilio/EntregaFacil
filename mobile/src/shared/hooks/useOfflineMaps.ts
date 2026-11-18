import { useState, useCallback, useEffect } from 'react';
import { FileSystem, FileSystemUploadOptions } from 'expo-file-system';
import { Alert } from 'react-native';
import { useAppStore } from '../store';
import { apiClient } from '../api/client';

export interface MapRegion {
  id: string;
  name: string;
  size: number; // bytes
  url: string;
  version: string;
  downloadedAt?: string;
  localPath?: string;
}

export interface DownloadProgress {
  regionId: string;
  progress: number; // 0-1
  bytesWritten: number;
  totalBytes: number;
  status: 'downloading' | 'paused' | 'completed' | 'error';
  error?: string;
}

export function useOfflineMaps() {
  const [manifest, setManifest] = useState<MapRegion[]>([]);
  const [downloads, setDownloads] = useState<Map<string, DownloadProgress>>(new Map());
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [lastManifestFetch, setLastManifestFetch] = useState<number>(0);
  
  const { preferences } = useAppStore();

  // Carrega manifest do servidor
  const fetchManifest = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastManifestFetch < 24 * 60 * 60 * 1000) { // 24h cache
      return;
    }

    try {
      const response = await fetch('https://cdn.entregafacil.app/tiles/manifest.json');
      if (!response.ok) throw new Error('Failed to fetch manifest');
      
      const data = await response.json();
      const regions: MapRegion[] = Object.entries(data.regions).map(([id, region]: any) => ({
        id,
        ...region,
      }));
      
      setManifest(regions);
      setLastManifestFetch(now);
      
      // Verifica atualizações para regiões já baixadas
      checkLocalUpdates(regions);
    } catch (error) {
      console.error('Failed to fetch manifest:', error);
    }
  }, [lastManifestFetch]);

  // Verifica se mapas locais precisam atualização
  const checkLocalUpdates = useCallback(async (regions: MapRegion[]) => {
    for (const region of regions) {
      const localInfo = await FileSystem.getInfoAsync(
        `${FileSystem.documentDirectory}tiles/${region.id}.mbtiles`
      );
      
      if (localInfo.exists) {
        // TODO: Comparar versão local com servidor
        // Por enquanto, só marca como precisa atualização se > 60 dias
        // Implementação completa precisaria armazenar versão local
      }
    }
  }, []);

  // Baixa região com progresso real + resume
  const downloadRegion = useCallback(async (region: MapRegion) => {
    const fileUri = `${FileSystem.documentDirectory}tiles/${region.id}.mbtiles`;
    
    // Verifica se já existe e pega offset para resume
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    const resumeOffset = fileInfo.exists ? fileInfo.size : 0;
    
    // Verifica espaço em disco
    const freeSpace = await FileSystem.getFreeDiskStorageAsync();
    const neededSpace = region.size - resumeOffset + 50 * 1024 * 1024; // +50MB buffer
    
    if (freeSpace < neededSpace) {
      Alert.alert('Espaço Insuficiente', `Precisa de ${(neededSpace / 1024 / 1024).toFixed(0)}MB livres. Disponível: ${(freeSpace / 1024 / 1024).toFixed(0)}MB`);
      return;
    }

    // Só WiFi se configurado
    // TODO: Verificar NetInfo se preferences.syncApenasWifi

    const downloadId = region.id;
    setDownloads(prev => {
      const next = new Map(prev);
      next.set(downloadId, {
        regionId: downloadId,
        progress: resumeOffset / region.size,
        bytesWritten: resumeOffset,
        totalBytes: region.size,
        status: 'downloading',
      });
      return next;
    });

    try {
      const download = FileSystem.createDownloadResumable(
        region.url,
        fileUri,
        {
          headers: resumeOffset > 0 ? { 'Range': `bytes=${resumeOffset}-` } : {},
        }
      );

      const result = await download.downloadAsync(
        (progress) => {
          const totalWritten = progress.totalBytesWritten + resumeOffset;
          const totalExpected = progress.totalBytesExpectedToWrite + resumeOffset;
          
          setDownloads(prev => {
            const next = new Map(prev);
            next.set(downloadId, {
              regionId: downloadId,
              progress: totalWritten / totalExpected,
              bytesWritten: totalWritten,
              totalBytes: totalExpected,
              status: 'downloading',
            });
            return next;
          });
        }
      );

      if (result.status === 200) {
        // Atualiza MapLibre source (precisa recarregar estilo)
        // Isso será feito via evento no componente MapView
        setDownloads(prev => {
          const next = new Map(prev);
          next.set(downloadId, {
            regionId: downloadId,
            progress: 1,
            bytesWritten: region.size,
            totalBytes: region.size,
            status: 'completed',
          });
          return next;
        });

        // Salva metadados
        await FileSystem.writeAsStringAsync(
          `${FileSystem.documentDirectory}tiles/${region.id}.meta.json`,
          JSON.stringify({
            version: region.version,
            downloadedAt: new Date().toISOString(),
            size: region.size,
          })
        );

        Alert.alert('Sucesso', `Mapa ${region.name} baixado com sucesso!`);
      } else {
        throw new Error(`Download failed: ${result.status}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      setDownloads(prev => {
        const next = new Map(prev);
        next.set(downloadId, {
          regionId: downloadId,
          progress: resumeOffset / region.size,
          bytesWritten: resumeOffset,
          totalBytes: region.size,
          status: 'error',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
        return next;
      });
      Alert.alert('Erro no Download', error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }, []);

  // Pausa download
  const pauseDownload = useCallback(async (regionId: string) => {
    // FileSystem não tem pause nativo, mas podemos cancelar e resumir depois
    // Por enquanto, apenas marca como pausado
    setDownloads(prev => {
      const next = new Map(prev);
      const existing = next.get(regionId);
      if (existing && existing.status === 'downloading') {
        next.set(regionId, { ...existing, status: 'paused' });
      }
      return next;
    });
  }, []);

  // Remove mapa baixado
  const removeRegion = useCallback(async (regionId: string) => {
    const fileUri = `${FileSystem.documentDirectory}tiles/${regionId}.mbtiles`;
    const metaUri = `${FileSystem.documentDirectory}tiles/${regionId}.meta.json`;
    
    try {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      await FileSystem.deleteAsync(metaUri, { idempotent: true });
      
      // Atualiza manifest local
      setManifest(prev => prev.map(r => r.id === regionId ? { ...r, downloadedAt: undefined, localPath: undefined } : r));
      
      Alert.alert('Removido', 'Mapa removido com sucesso');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao remover mapa');
    }
  }, []);

  // Verifica atualizações periódicas
  useEffect(() => {
    fetchManifest();
    
    const interval = setInterval(() => {
      fetchManifest(true);
    }, 60 * 60 * 1000); // 1 hora
    
    return () => clearInterval(interval);
  }, [fetchManifest]);

  // Auto-limpa downloads antigos com erro
  useEffect(() => {
    const interval = setInterval(() => {
      setDownloads(prev => {
        const next = new Map(prev);
        for (const [id, download] of next.entries()) {
          if (download.status === 'error' && Date.now() - (download as any).timestamp > 24 * 60 * 60 * 1000) {
            next.delete(id);
          }
        }
        return next;
      });
    }, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    manifest,
    downloads,
    checkingUpdates,
    fetchManifest,
    downloadRegion,
    pauseDownload,
    removeRegion,
    // Helpers
    isDownloading: (regionId: string) => downloads.get(regionId)?.status === 'downloading',
    isCompleted: (regionId: string) => downloads.get(regionId)?.status === 'completed',
    getProgress: (regionId: string) => downloads.get(regionId)?.progress || 0,
    getDownloadStatus: (regionId: string) => downloads.get(regionId)?.status || 'not_started',
  };
}

// Helper para formatar bytes
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default useOfflineMaps;