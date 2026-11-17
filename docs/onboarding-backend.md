# Onboarding Backend — EntregaFácil

**Versão:** 0.1  
**Público:** Dev Backend (Node.js + Hono + TypeScript)  
**Pré-requisitos:** Node 20+, Yarn 4+, Docker, PostgreSQL 16+ PostGIS, Redis 7

---

## 1. Setup Inicial

```bash
# Clone
git clone git@github.com:seu-org/entregafacil.git
cd entregafacil/backend

# Install
yarn install

# Variáveis de ambiente
cp .env.example .env
# Editar .env com todas as variáveis (ver seção 2)

# Verificar setup
yarn doctor
```

---

## 2. Variáveis de Ambiente (.env)

```bash
# App
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

# Database (PostgreSQL + PostGIS)
DATABASE_URL=postgresql://user:pass@localhost:5432/entregafacil?schema=public
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_POOL_SIZE=10

# MinIO (S3-compatible)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=entregafacil
MINIO_USE_SSL=false

# Auth (Better Auth)
BETTER_AUTH_SECRET=your-super-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# OSRM (Routing)
OSRM_BASE_URL=http://localhost:5000
OSRM_API_KEY=  # opcional

# GraphHopper (VRP)
GRAPHHOPPER_BASE_URL=http://localhost:8989
GRAPHHOPPER_API_KEY=  # opcional

# Evolution API (WhatsApp)
EVOLUTION_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=your-evolution-api-key
EVOLUTION_WEBHOOK_SECRET=webhook-secret-for-signature-validation

# Monitoring
SENTRY_DSN=  # opcional
LOG_LEVEL=debug

# Feature Flags
ENABLE_GRAPHHOPPER_VRP=false
ENABLE_MAPBOX_FALLBACK=false
```

---

## 3. Database Setup

```bash
# Subir PostgreSQL + PostGIS + Redis + MinIO (Docker Compose)
cd ../infra
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d postgres redis minio

# Verificar saúde
docker compose logs postgres | grep "database system is ready to accept connections"
docker compose exec postgres psql -U user -d entregafacil -c "SELECT PostGIS_Version();"

# Migrations (Drizzle)
cd ../backend
yarn db:generate    # Gera migrações SQL em drizzle/migrations/
yarn db:migrate     # Aplica migrações
yarn db:studio      # Abre Drizzle Studio (UI)

# Seed desenvolvimento (opcional)
yarn db:seed
```

---

## 4. Desenvolvimento

```bash
# Hot reload (tsx watch)
yarn dev

# Testes
yarn test:unit              # Vitest unitários
yarn test:integration       # Vitest + testcontainers (PG, Redis)
yarn test:coverage          # Coverage report

# Lint + Typecheck
yarn lint
yarn typecheck

# Build produção
yarn build                  # tsc -> dist/
yarn start                  # node dist/index.js
```

---

## 5. Estrutura de Rotas (Hono)

```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimit';

import authRoutes from './routes/auth';
import addressRoutes from './routes/addresses';
import routeRoutes from './routes/routes';
import deliveryRoutes from './routes/deliveries';
import syncRoutes from './routes/sync';
import reportRoutes from './routes/reports';
import healthRoutes from './routes/health';

const app = new Hono();

// Middlewares globais
app.use('*', logger());
app.use('*', cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use('/api/v1/*', rateLimiter({ windowMs: 60000, max: 100 }));

// Health (sem auth)
app.route('/health', healthRoutes);

// Auth routes
app.route('/api/v1/auth', authRoutes);

// Protected routes
const api = app.basePath('/api/v1');
api.use('*', authMiddleware);

api.route('/addresses', addressRoutes);
api.route('/routes', routeRoutes);
api.route('/deliveries', deliveryRoutes);
api.route('/sync', syncRoutes);
api.route('/reports', reportRoutes);

export default app;
```

---

## 6. Serviços Externos Clients

### OSRM Client
```typescript
// src/services/osrm.ts
export class OSRMClient {
  private baseUrl: string;
  
  async trip(waypoints: [number, number][], options?: TripOptions): Promise<TripResponse> {
    const coords = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const params = new URLSearchParams({
      steps: 'true',
      source: 'first',
      destination: 'last',
      roundtrip: 'false',
      geometries: 'polyline6',
      overview: 'simplified',
      annotations: 'duration,distance',
      ...options
    });
    
    const resp = await fetch(`${this.baseUrl}/trip/v1/driving/${coords}?${params}`);
    return resp.json();
  }
  
  async route(waypoints: [number, number][], options?: RouteOptions): Promise<RouteResponse> {
    // Para recálculo desvio
  }
}
```

### Evolution API Client
```typescript
// src/services/evolution.ts
export class EvolutionClient {
  private baseUrl: string;
  private apiKey: string;
  
  async sendText(instance: string, number: string, text: string): Promise<SendResponse> {
    const resp = await fetch(`${this.baseUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': this.apiKey },
      body: JSON.stringify({ number, text, options: { delay: 1000, presence: 'composing' } })
    });
    return resp.json();
  }
  
  async getConnectionState(instance: string): Promise<ConnectionState> {
    const resp = await fetch(`${this.baseUrl}/instance/connectionState/${instance}`, {
      headers: { 'apikey': this.apiKey }
    });
    return resp.json();
  }
  
  // WebSocket para callbacks tempo real
  connectWebSocket(instance: string, handlers: WSHandlers): WebSocket {
    const ws = new WebSocket(`${this.baseUrl.replace('http', 'ws')}/ws/${instance}?apikey=${this.apiKey}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handlers[data.event]?.(data);
    };
    return ws;
  }
}
```

---

## 7. Sync Engine (Conflict Resolution)

```typescript
// src/services/sync.ts
export async function handleSyncBatch(operations: SyncOperation[], clientId: string) {
  const results = { applied: 0, conflicts: 0, serverChanges: [], conflictsDetail: [] };
  
  for (const op of operations) {
    // 1. Idempotency
    const existing = await db.syncLog.findUnique({ where: { operationId: op.id } });
    if (existing) { results.applied++; continue; }
    
    // 2. LWW Conflict Check
    const current = await db[op.entity].findUnique({ where: { id: op.payload.id } });
    if (current && op.type !== 'create') {
      const serverTs = current.updatedAt.getTime();
      const clientTs = op.timestamp;
      if (serverTs > clientTs + 1000) { // 1s clock skew tolerance
        results.conflicts++;
        results.conflictsDetail.push({ opId: op.id, reason: 'server_newer', action: 'manual_merge' });
        await flagManualMerge(clientId, op.entity, op.payload.id, current, op.payload);
        continue;
      }
    }
    
    // 3. Apply
    await db.$transaction(async (tx) => {
      switch (op.type) {
        case 'create': await tx[op.entity].create({ data: op.payload }); break;
        case 'update': await tx[op.entity].update({ where: { id: op.payload.id }, data: op.payload }); break;
        case 'delete': await tx[op.entity].delete({ where: { id: op.payload.id } }); break;
      }
      await tx.syncLog.create({ data: { operationId: op.id, clientId, entity: op.entity, appliedAt: new Date() } });
    });
    results.applied++;
  }
  
  // 4. Server changes since last sync
  results.serverChanges = await fetchServerChangesSince(clientId);
  return results;
}
```

---

## 8. Docker & Deploy

```bash
# Build imagem
docker build -t entregafacil-api:latest .

# Staging
cd ../infra
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d api

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d api

# Health check
curl -f http://localhost:3000/health
```

### Dockerfile
```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

FROM base AS builder
COPY . .
RUN yarn build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

---

## 9. Monitoramento & Logs

```typescript
// Structured logging (Pino)
import pino from 'pino';
export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Uso
logger.info({ userId, routeId, action: 'route_optimized' }, 'Rota otimizada com sucesso');
logger.error({ err, userId, action: 'whatsapp_send_failed' }, 'Falha ao enviar WhatsApp');
```

### Métricas Prometheus (via `/metrics` endpoint)
- `http_requests_total` (method, path, status)
- `http_request_duration_seconds` (histogram)
- `sync_operations_total` (status: applied, conflict, error)
- `whatsapp_messages_total` (status: sent, delivered, read, failed)
- `osrm_request_duration_seconds` (histogram)
- `graphhopper_request_duration_seconds` (histogram)

---

## 10. Troubleshooting Comum

| Problema | Diagnóstico | Solução |
|----------|-------------|---------|
| DB connection failed | `docker compose logs postgres` | Verificar DATABASE_URL, postgres saudável |
| Redis connection failed | `redis-cli ping` | Verificar REDIS_URL, redis saudável |
| OSRM 502/timeout | `curl http://localhost:5000/health` | Reiniciar container OSRM, verificar PBF |
| Evolution API 401 | Verificar EVOLUTION_API_KEY | Regenerar key no Evolution Manager |
| Sync conflicts altos | Logs `sync_operations_total{status="conflict"}` | Verificar clock skew devices, LWW logic |
| JWT expired | Logs 401 em requests | Verificar BETTER_AUTH_SECRET, clock sync server |

---

## 11. Referências Rápidas

- [Hono Docs](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Better Auth](https://better-auth.com/)
- [PostGIS](https://postgis.net/docs/)
- [OSRM HTTP API](https://github.com/Project-OSRM/osrm-backend/blob/master/docs/http.md)
- [GraphHopper API](https://docs.graphhopper.com/)
- [Evolution API Docs](https://docs.evolutionfoundation.com.br)
- [MinIO SDK](https://min.io/docs/minio/linux/developers/javascript/API.html)