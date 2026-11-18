import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { motoristas } from './motoristas';

export const syncStatusEnum = pgEnum('sync_status', [
  'pendente',
  'processando',
  'concluido',
  'erro',
  'conflito',
]);

export const syncQueue = pgTable(
  'sync_queue',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    motoristaId: uuid('motorista_id')
      .references(() => motoristas.id, { onDelete: 'cascade' })
      .notNull(),
    operacaoId: uuid('operacao_id').notNull().unique(),
    tipo: varchar('tipo', { length: 10 }).notNull(), // create, update, delete
    entidade: varchar('entidade', { length: 50 }).notNull(),
    payload: jsonb('payload').notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    tentativas: integer('tentativas').notNull().default(0),
    status: syncStatusEnum('status').notNull().default('pendente'),
    erro: text('erro'),
    resolvidoEm: timestamp('resolvido_em'),
    serverTimestamp: timestamp('server_timestamp'),
  },
  (t) => [
    index('idx_sync_queue_motorista_status').on(t.motoristaId, t.status),
    index('idx_sync_queue_timestamp').on(t.timestamp),
    uniqueIndex('uq_sync_queue_operacao').on(t.operacaoId),
  ]
);

export const SyncOperationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['create', 'update', 'delete']),
  entity: z.enum(['address', 'route', 'waypoint', 'delivery', 'whatsapp_log', 'motorista', 'veiculo']),
  payload: z.record(z.any()),
  timestamp: z.number(),
});

export type SyncOperation = z.infer<typeof SyncOperationSchema>;

export const insertSyncQueueSchema = createInsertSchema(syncQueue, {
  tipo: z.enum(['create', 'update', 'delete']),
  entidade: z.enum(['address', 'route', 'waypoint', 'delivery', 'whatsapp_log', 'motorista', 'veiculo']),
}).omit({
  id: true,
  timestamp: true,
  tentativas: true,
  status: true,
  resolvidoEm: true,
  serverTimestamp: true,
});

export const selectSyncQueueSchema = createSelectSchema(syncQueue);
export type SyncQueue = z.infer<typeof selectSyncQueueSchema>;
export type NewSyncQueue = z.infer<typeof insertSyncQueueSchema>;