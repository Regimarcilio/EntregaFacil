import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  sql,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { motoristas } from './motoristas';

export const veiculos = pgTable(
  'veiculos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    motoristaId: uuid('motorista_id')
      .references(() => motoristas.id, { onDelete: 'cascade' })
      .notNull(),
    placa: varchar('placa', { length: 8 }).notNull().unique(),
    modelo: varchar('modelo', { length: 50 }).notNull(),
    cor: varchar('cor', { length: 30 }),
    ano: integer('ano'),
    tipo: varchar('tipo', { length: 10 }).notNull(), // moto, carro, bike
    crlvUrl: varchar('crlv_url', { length: 500 }),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('idx_veiculos_motorista').on(t.motoristaId),
    index('idx_veiculos_placa').on(t.placa),
    uniqueIndex('uq_veiculos_motorista_default').on(t.motoristaId).where(sql`is_default = true`),
  ]
);

export const insertVeiculoSchema = createInsertSchema(veiculos, {
  placa: z.string().regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i, 'Placa deve estar no formato brasileiro (ABC-1234 ou ABC1D23)'),
  tipo: z.enum(['moto', 'carro', 'bike']),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectVeiculoSchema = createSelectSchema(veiculos);
export type Veiculo = z.infer<typeof selectVeiculoSchema>;
export type NewVeiculo = z.infer<typeof insertVeiculoSchema>;