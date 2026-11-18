import { Hono } from 'hono';
import { healthCheck } from '../db';
import { getRedis } from '../services/redis';
import { logger } from '../utils/logger';

const health = new Hono();

// GET /health - Health check básico
health.get('/', async (c) => {
  return c.json({
    status: 'ok',
    service: 'entregafacil-api',
    version: process.env.APP_VERSION || '0.1.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// GET /health/ready - Readiness check (dependências)
health.get('/ready', async (c) => {
  const checks = {
    database: false,
    redis: false,
  };

  // Database
  try {
    checks.database = await healthCheck();
  } catch (error) {
    logger.error({ err: error }, 'Database health check failed');
  }

  // Redis
  try {
    const redis = await getRedis();
    if (redis?.isOpen) {
      await redis.ping();
      checks.redis = true;
    }
  } catch (error) {
    logger.error({ err: error }, 'Redis health check failed');
  }

  const allHealthy = Object.values(checks).every((v) => v);
  const status = allHealthy ? 'ready' : 'not_ready';

  return c.json(
    {
      status,
      checks,
      timestamp: new Date().toISOString(),
    },
    allHealthy ? 200 : 503
  );
});

// GET /health/live - Liveness check
health.get('/live', (c) => {
  return c.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export default health;