import { useState, useCallback, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { IMAGE_CONFIG } from '../utils/performance';

interface CachedImage {
  uri: string;
  localUri: string;
  timestamp: number;
  size: number;
}

const CACHE_DIR = `${FileSystem.cacheDirectory}images/`;
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

export function useImageCache() {
  const [cacheSize, setCacheSize] = useState(0);
  const [loading, setLoading] = useState(false);

  // Initialize cache directory
  useEffect(() => {
    ensureCacheDir();
    calculateCacheSize();
  }, []);

  const ensureCacheDir = async () => {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  };

  const calculateCacheSize = async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
      let totalSize = 0;
      
      for (const file of files) {
        const info = await FileSystem.getInfoAsync(`${CACHE_DIR}${file}`);
        if (info.size) totalSize += info.size;
      }
      
      setCacheSize(totalSize);
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
    }
  };

  const getCachedImage = useCallback(async (uri: string): Promise<string | null> => {
    if (!uri) return null;
    
    const filename = hashString(uri) + getExtension(uri);
    const localUri = `${CACHE_DIR}${filename}`;
    
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists) {
      // Check TTL
      const age = Date.now() - info.modificationTime * 1000;
      if (age < CACHE_TTL) {
        return localUri;
      } else {
        // Expired, delete
        await FileSystem.deleteAsync(localUri, { idempotent: true });
      }
    }
    
    return null;
  }, []);

  const cacheImage = useCallback(async (uri: string): Promise<string | null> => {
    if (!uri) return null;
    
    // Check if already cached
    const existing = await getCachedImage(uri);
    if (existing) return existing;
    
    const filename = hashString(uri) + getExtension(uri);
    const localUri = `${CACHE_DIR}${filename}`;
    
    try {
      setLoading(true);
      
      // Check cache size before downloading
      if (cacheSize > MAX_CACHE_SIZE * 0.9) {
        await cleanupOldCache();
      }
      
      // Download image
      const downloadResult = await FileSystem.downloadAsync(uri, localUri, {
        md5: true,
        headers: {
          'User-Agent': 'EntregaFacil/1.0',
        },
      });
      
      if (downloadResult.status === 200) {
        await calculateCacheSize();
        return localUri;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to cache image:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [cacheSize, getCachedImage]);

  const cleanupOldCache = useCallback(async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
      const fileInfos = await Promise.all(
        files.map(async (file) => {
          const info = await FileSystem.getInfoAsync(`${CACHE_DIR}${file}`);
          return { file, ...info };
        })
      );
      
      // Sort by modification time (oldest first)
      fileInfos.sort((a, b) => (a.modificationTime || 0) - (b.modificationTime || 0));
      
      // Delete oldest 30% of files
      const toDelete = Math.ceil(fileInfos.length * 0.3);
      for (let i = 0; i < toDelete; i++) {
        await FileSystem.deleteAsync(`${CACHE_DIR}${fileInfos[i].file}`, { idempotent: true });
      }
      
      await calculateCacheSize();
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await ensureCacheDir();
      setCacheSize(0);
    } catch (error) {
      console.error('Clear cache failed:', error);
    }
  }, []);

  const formatCacheSize = useCallback(() => {
    if (cacheSize === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(cacheSize) / Math.log(k));
    return parseFloat((cacheSize / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, [cacheSize]);

  return {
    cacheSize,
    loading,
    getCachedImage,
    cacheImage,
    clearCache,
    formatCacheSize,
  };
}

// Helper functions
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function getExtension(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
  return match ? '.' + match[1] : '.jpg';
}