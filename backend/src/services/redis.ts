import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;
let isConnecting = false;

export async function getRedis(): Promise<RedisClientType | null> {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (isConnecting) {
    // Aguarda conexão existente
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (redisClient?.isOpen) return redisClient;
    }
  }

  return connectRedis();
}

async function connectRedis(): Promise<RedisClientType | null> {
  if (isConnecting) return null;
  isConnecting = true;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis max retries reached');
            return new Error('Max retries reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis client error');
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });

    await redisClient.connect();
    isConnecting = false;
    return redisClient;
  } catch (error) {
    isConnecting = false;
    logger.error({ err: error }, 'Failed to connect to Redis');
    return null;
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient?.isOpen) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

// Helper functions
export async function setCache<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.error({ err: error, key }, 'Cache set failed');
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  if (!redis) return null;

  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error({ err: error, key }, 'Cache get failed');
    return null;
  }
}

export async function deleteCache(key: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    logger.error({ err: error, key }, 'Cache delete failed');
  }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    logger.error({ err: error, pattern }, 'Cache pattern delete failed');
  }
}