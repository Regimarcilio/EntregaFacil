import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware } from './middleware/auth';
import { apiRateLimiter } from './middleware/rateLimit';
import { logger } from './utils/logger';
import { closePool } from './db';
import { closeRedis } from './services/redis';

import authRoutes from './routes/auth';
import healthRoutes from './routes/health';
import addressRoutes from './routes/addresses';
import routeRoutes from './routes/routes';
import deliveryRoutes from './routes/deliveries';
import whatsappRoutes from './routes/whatsapp';
import syncRoutes from './routes/sync';

const app = new Hono();

// Middlewares globais
app.use('*', honoLogger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:8081', 'exp://localhost:8081'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
    maxAge: 86400,
  })
);

// Rate limiting global
app.use('/api/*', apiRateLimiter);

// Health checks (sem rate limiting)
app.route('/health', healthRoutes);

// API v1 routes
const api = app.basePath('/api/v1');

// Auth routes (públicas)
api.route('/auth', authRoutes);

// Protected routes
api.use('*', authMiddleware);

api.route('/addresses', addressRoutes);
api.route('/routes', routeRoutes);
api.route('/deliveries', deliveryRoutes);
api.route('/whatsapp', whatsappRoutes);
api.route('/sync', syncRoutes);

// TODO: api.route('/reports', reportRoutes);

// Webhook para Evolution API (público, sem auth)
app.post('/webhook/evolution', async (c) => {
  const body = await c.req.json();
  return c.json({ received: true });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Endpoint não encontrado' }, 404);
});

// Error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  logger.error({ err }, 'Unhandled error');
  return c.json(
    {
      error: 'Erro interno do servidor',
      requestId: c.get('requestId') || 'unknown',
    },
    500
  );
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down...');
  await closePool();
  await closeRedis();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const port = parseInt(process.env.PORT || '3000', 10);

export default {
  fetch: app.fetch,
  port,
};

logger.info(`Server starting on port ${port}`);