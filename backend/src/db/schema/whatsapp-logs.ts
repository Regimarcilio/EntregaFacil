import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { entregas } from './entregas';
import { motoristas } from './motoristas';

export const whatsappStatusEnum = pgEnum('whatsapp_status', [
  'enviado',
  'entregue',
  'lido',
  'erro',
]);

export const whatsappLogs = pgTable(
  'whatsapp_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    motoristaId: uuid('motorista_id')
      .references(() => motoristas.id, { onDelete: 'cascade' })
      .notNull(),
    entregaId: uuid('entrega_id')
      .references(() => entregas.id, { onDelete: 'cascade' }),
    messageId: varchar('message_id', { length: 100 }).notNull(),
    destinatarioNome: varchar('destinatario_nome', { length: 100 }).notNull(),
    telefone: varchar('telefone', { length: 20 }).notNull(),
    templateUsado: varchar('template_usado', { length: 50 }).notNull(),
    status: whatsappStatusEnum('status').notNull().default('enviado'),
    enviadoEm: timestamp('enviado_em').defaultNow().notNull(),
    entregueEm: timestamp('entregue_em'),
    lidoEm: timestamp('lido_em'),
    erro: text('erro'),
    payload: jsonb('payload').$type<Record<string, any>>(),
  },
  (t) => [
    index('idx_whatsapp_logs_motorista').on(t.motoristaId),
    index('idx_whatsapp_logs_entrega').on(t.entregaId),
    index('idx_whatsapp_logs_message_id').on(t.messageId),
    index('idx_whatsapp_logs_status').on(t.status),
    index('idx_whatsapp_logs_enviado_em').on(t.enviadoEm),
  ]
);

export const insertWhatsAppLogSchema = createInsertSchema(whatsappLogs).omit({
  id: true,
  enviadoEm: true,
});

export const selectWhatsAppLogSchema = createSelectSchema(whatsappLogs);
export type WhatsAppLog = z.infer<typeof selectWhatsAppLogSchema>;
export type NewWhatsAppLog = z.infer<typeof insertWhatsAppLogSchema>;