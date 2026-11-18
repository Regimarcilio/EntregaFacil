import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { motoristas } from './motoristas';

export const syncLog = pgTable(
  'sync_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    motoristaId: uuid('motorista_id')
      .references(() => motoristas.id, { onDelete: 'cascade' })
      .notNull(),
    operationId: uuid('operation_id').notNull().unique(),
    clientId: varchar('client_id', { length: 100 }).notNull(),
    entity: varchar('entity', { length: 50 }).notNull(),
    action: varchar('action', { length: 10 }).notNull(),
    appliedAt: timestamp('applied_at').defaultNow().notNull(),
    payloadHash: varchar('payload_hash', { length: 64 }).notNull(),
    serverData: jsonb('server_data').$type<Record<string, any>>(),
  },
  (t) => [
    index('idx_sync_log_motorista').on(t.motoristaId),
    index('idx_sync_log_operation').on(t.operationId),
    index('idx_sync_log_applied_at').on(t.appliedAt),
  ]
);

export const insertSyncLogSchema = createInsertSchema(syncLog).omit({
  id: true,
  appliedAt: true,
});

export const selectSyncLogSchema = createSelectSchema(syncLog);
export type SyncLog = z.infer<typeof selectSyncLogSchema>;
export type NewSyncLog = z.infer<typeof insertSyncLogSchema>;