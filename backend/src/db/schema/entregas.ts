import {
  pgTable,
  uuid,
  varchar,
  text,
  doublePrecision,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { rotas } from './rotas';
import { enderecos } from './enderecos';

export const problemTypeEnum = pgEnum('problem_type', [
  'cliente_ausente',
  'endereco_errado',
  'recusou',
  'outro',
]);

export const entregas = pgTable(
  'entregas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rotaId: uuid('rota_id')
      .references(() => rotas.id, { onDelete: 'cascade' })
      .notNull(),
    waypointId: uuid('waypoint_id').notNull(),
    enderecoId: uuid('endereco_id')
      .references(() => enderecos.id, { onDelete: 'restrict' })
      .notNull(),
    fotoUrl: varchar('foto_url', { length: 500 }).notNull(),
    fotoHash: varchar('foto_hash', { length: 64 }).notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    accuracy: doublePrecision('accuracy').notNull(),
    timestamp: timestamp('timestamp').notNull(),
    assinaturaUrl: varchar('assinatura_url', { length: 500 }),
    observacao: text('observacao'),
    tipoProblema: problemTypeEnum('tipo_problema'),
    whatsappLogId: uuid('whatsapp_log_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('idx_entregas_rota').on(t.rotaId),
    index('idx_entregas_waypoint').on(t.waypointId),
    index('idx_entregas_timestamp').on(t.timestamp),
    index('idx_entregas_foto_hash').on(t.fotoHash),
  ]
);

export const insertEntregaSchema = createInsertSchema(entregas, {
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive(),
  fotoHash: z.string().length(64),
}).omit({
  id: true,
  createdAt: true,
});

export const selectEntregaSchema = createSelectSchema(entregas);
export type Entrega = z.infer<typeof selectEntregaSchema>;
export type NewEntrega = z.infer<typeof insertEntregaSchema>;