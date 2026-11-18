import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDB } from '../db';
import { syncQueue } from '../db/schema/sync-queue';
import { syncLog } from '../db/schema/sync-log';
import { motoristas } from '../db/schema/motoristas';
import { enderecos } from '../db/schema/enderecos';
import { rotas } from '../db/schema/rotas';
import { entregas } from '../db/schema/entregas';
import { whatsappLogs } from '../db/schema/whatsapp-logs';
import { veiculos } from '../db/schema/veiculos';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const sync = new Hono();

sync.use('*', authMiddleware);

// Schemas
const syncOperationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['create', 'update', 'delete']),
  entity: z.enum(['address', 'route', 'waypoint', 'delivery', 'whatsapp_log', 'motorista', 'veiculo']),
  payload: z.record(z.any()),
  timestamp: z.number(),
});

const syncBatchSchema = z.object({
  operations: z.array(syncOperationSchema).min(1).max(50),
});

// POST /sync/batch - Processa batch de operações offline
sync.post('/batch', zValidator('json', syncBatchSchema), async (c) => {
  const user = c.get('user');
  const { operations } = c.req.valid('json');
  const db = getDB();

  const results = {
    applied: 0,
    conflicts: 0,
    errors: 0,
    serverChanges: [] as any[],
    conflictsDetail: [] as any[],
  };

  for (const op of operations) {
    try {
      // 1. Idempotency check
      const [existingLog] = await db.select()
        .from(syncLog)
        .where(eq(syncLog.operationId, op.id))
        .limit(1);

      if (existingLog) {
        results.applied++;
        continue;
      }

      // 2. Busca entidade atual no servidor
      const entityTable = getEntityTable(op.entity);
      if (!entityTable) {
        results.errors++;
        continue;
      }

      let current: any = null;
      if (op.type !== 'create') {
        const [found] = await db.select()
          .from(entityTable)
          .where(and(eq(entityTable.id, op.payload.id), eq(entityTable.motoristaId, user.motoristaId)))
          .limit(1);
        current = found;
      }

      // 3. LWW Conflict Resolution
      if (current && op.type !== 'create') {
        const serverTs = new Date(current.updatedAt).getTime();
        const clientTs = op.timestamp;

        // Tolerância de 1 segundo para clock skew
        if (serverTs > clientTs + 1000) {
          results.conflicts++;
          results.conflictsDetail.push({
            opId: op.id,
            reason: 'server_newer',
            serverData: current,
            clientData: op.payload,
            action: 'manual_merge',
          });
          
          // Marca na queue local para merge manual
          await db.insert(syncQueue).values({
            motoristaId: user.motoristaId,
            operacaoId: op.id,
            tipo: 'conflict',
            entidade: op.entity,
            payload: { server: current, client: op.payload, originalOp: op },
            status: 'conflito',
            erro: 'Server newer - manual merge required',
          }).onConflictDoNothing();

          continue;
        }
      }

      // 4. Aplica operação
      await db.transaction(async (tx) => {
        switch (op.type) {
          case 'create':
            // Remove motoristaId do payload se já existir no schema
            const createData = { ...op.payload, motoristaId: user.motoristaId };
            await tx.insert(entityTable).values(createData);
            break;
          case 'update':
            await tx.update(entityTable)
              .set({ ...op.payload, updatedAt: new Date() })
              .where(and(eq(entityTable.id, op.payload.id), eq(entityTable.motoristaId, user.motoristaId)));
            break;
          case 'delete':
            await tx.delete(entityTable)
              .where(and(eq(entityTable.id, op.payload.id), eq(entityTable.motoristaId, user.motoristaId)));
            break;
        }

        // Log para idempotência
        await tx.insert(syncLog).values({
          motoristaId: user.motoristaId,
          operationId: op.id,
          clientId: user.motoristaId,
          entity: op.entity,
          action: op.type,
          appliedAt: new Date(),
          payloadHash: crypto.createHash('sha256').update(JSON.stringify(op.payload)).digest('hex'),
          serverData: current,
        });
      });

      results.applied++;

    } catch (error) {
      logger.error({ err: error, opId: op.id }, 'Sync operation failed');
      results.errors++;
      
      // Marca erro na queue
      await db.insert(syncQueue).values({
        motoristaId: user.motoristaId,
        operacaoId: op.id,
        tipo: op.type,
        entidade: op.entity,
        payload: op.payload,
        status: 'erro',
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      }).onConflictDoNothing();
    }
  }

  // 5. Busca mudanças do servidor desde último sync
  const [lastSync] = await db.select({ lastSyncAt: motoristas.lastSyncAt })
    .from(motoristas)
    .where(eq(motoristas.id, user.motoristaId))
    .limit(1);

  if (lastSync?.lastSyncAt) {
    results.serverChanges = await fetchServerChangesSince(user.motoristaId, lastSync.lastSyncAt);
  }

  // Atualiza lastSyncAt
  await db.update(motoristas)
    .set({ lastSyncAt: new Date() })
    .where(eq(motoristas.id, user.motoristaId));

  return c.json(results);
});

// GET /sync/changes - Busca mudanças do servidor desde timestamp
sync.get('/changes', async (c) => {
  const user = c.get('user');
  const since = c.req.query('since');
  
  if (!since) {
    return c.json({ error: 'since parameter required' }, 400);
  }

  const changes = await fetchServerChangesSince(user.motoristaId, since);
  return c.json({ changes });
});

// GET /sync/status - Status da sync queue
sync.get('/status', async (c) => {
  const user = c.get('user');
  const db = getDB();

  const stats = await db.select({
    status: syncQueue.status,
    count: sql`count(*)`,
  })
    .from(syncQueue)
    .where(eq(syncQueue.motoristaId, user.motoristaId))
    .groupBy(syncQueue.status);

  const pendingOps = await db.select()
    .from(syncQueue)
    .where(and(eq(syncQueue.motoristaId, user.motoristaId), eq(syncQueue.status, 'pendente')))
    .limit(10);

  return c.json({
    stats,
    pendingSample: pendingOps,
  });
});

// POST /sync/retry - Reprocessa operações com erro
sync.post('/retry', async (c) => {
  const user = c.get('user');
  const db = getDB();

  // Reseta operações com erro para pendente
  await db.update(syncQueue)
    .set({ status: 'pendente', erro: null })
    .where(and(eq(syncQueue.motoristaId, user.motoristaId), eq(syncQueue.status, 'erro')));

  return c.json({ message: 'Operações com erro resetadas para reprocessamento' });
});

// Helpers
function getEntityTable(entity: string) {
  const tables: Record<string, any> = {
    address: enderecos,
    route: rotas,
    waypoint: rotas, // waypoints são parte da rota
    delivery: entregas,
    whatsapp_log: whatsappLogs,
    motorista: motoristas,
    veiculo: veiculos,
  };
  return tables[entity];
}

async function fetchServerChangesSince(motoristaId: string, since: string): Promise<any[]> {
  const db = getDB();
  const sinceDate = new Date(since);
  const changes: any[] = [];

  // Endereços
  const enderecosChanges = await db.select()
    .from(enderecos)
    .where(and(eq(enderecos.motoristaId, motoristaId), sql`${enderecos.updatedAt} > ${sinceDate}`));
  changes.push(...enderecosChanges.map(e => ({ entity: 'address', action: 'update', data: e })));

  // Rotas
  const rotasChanges = await db.select()
    .from(rotas)
    .where(and(eq(rotas.motoristaId, motoristaId), sql`${rotas.updatedAt} > ${sinceDate}`));
  changes.push(...rotasChanges.map(r => ({ entity: 'route', action: 'update', data: r })));

  // Entregas (novas)
  const entregasChanges = await db.select()
    .from(entregas)
    .where(and(eq(entregas.motoristaId, motoristaId), sql`${entregas.createdAt} > ${sinceDate}`));
  changes.push(...entregasChanges.map(e => ({ entity: 'delivery', action: 'create', data: e })));

  return changes;
}

export default sync;