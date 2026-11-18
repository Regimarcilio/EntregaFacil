import {
  pgTable,
  uuid,
  varchar,
  text,
  doublePrecision,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { motoristas } from './motoristas';

export const enderecos = pgTable(
  'enderecos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    motoristaId: uuid('motorista_id')
      .references(() => motoristas.id, { onDelete: 'cascade' })
      .notNull(),
    nome: varchar('nome', { length: 100 }).notNull(),
    enderecoFormatado: varchar('endereco_formatado', { length: 300 }).notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    cep: varchar('cep', { length: 9 }),
    bairro: varchar('bairro', { length: 100 }),
    cidade: varchar('cidade', { length: 100 }).notNull(),
    estado: varchar('estado', { length: 2 }).notNull(),
    observacoes: text('observacoes'),
    destinatario: jsonb('destinatario').$type<Destinatario>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('idx_enderecos_motorista').on(t.motoristaId),
    index('idx_enderecos_geo').on(t.latitude, t.longitude),
    index('idx_enderecos_cidade_estado').on(t.cidade, t.estado),
  ]
);

export const DestinatarioSchema = z.object({
  nome: z.string().min(1).max(100),
  telefone: z.string().regex(/^\+?55\d{10,11}$/, 'Telefone deve estar no formato brasileiro com DDD'),
  notificar: z.enum(['sempre', 'nunca', 'apenas_problema']).default('sempre'),
});

export type Destinatario = z.infer<typeof DestinatarioSchema>;

export const insertEnderecoSchema = createInsertSchema(enderecos, {
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  destinatario: DestinatarioSchema.optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectEnderecoSchema = createSelectSchema(enderecos);
export type Endereco = z.infer<typeof selectEnderecoSchema>;
export type NewEndereco = z.infer<typeof insertEnderecoSchema>;