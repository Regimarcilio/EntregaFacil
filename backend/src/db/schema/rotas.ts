import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  doublePrecision,
  integer,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { motoristas } from './motoristas';
import { veiculos } from './veiculos';

export const routeStatusEnum = pgEnum('route_status', [
  'rascunho',
  'otimizada',
  'em_andamento',
  'concluida',
  'parcial',
  'cancelada',
]);

export const rotas = pgTable(
  'rotas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    motoristaId: uuid('motorista_id')
      .references(() => motoristas.id, { onDelete: 'cascade' })
      .notNull(),
    veiculoId: uuid('veiculo_id')
      .references(() => veiculos.id, { onDelete: 'set null' }),
    nome: varchar('nome', { length: 100 }).notNull(),
    data: timestamp('data').notNull(),
    status: routeStatusEnum('status').notNull().default('rascunho'),
    waypoints: jsonb('waypoints').$type<Waypoint[]>().notNull().default([]),
    geometry: jsonb('geometry').$type<GeoJSON.LineString>(),
    metricas: jsonb('metricas').$type<MetricasRota>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('idx_rotas_motorista_data').on(t.motoristaId, t.data),
    index('idx_rotas_status').on(t.status),
    index('idx_rotas_motorista_status').on(t.motoristaId, t.status),
  ]
);

export const waypointStatusEnum = pgEnum('waypoint_status', [
  'pendente',
  'em_rota',
  'entregue',
  'problema',
  'cancelada',
]);

export const WaypointSchema = z.object({
  id: z.string().uuid(),
  rotaId: z.string().uuid(),
  enderecoId: z.string().uuid(),
  ordem: z.number().int().nonnegative(),
  status: waypointStatusEnum.enum.default('pendente'),
  latitude: z.number(),
  longitude: z.number(),
  enderecoNome: z.string(),
  enderecoFormatado: z.string(),
});

export type Waypoint = z.infer<typeof WaypointSchema>;

export const MetricasRotaSchema = z.object({
  distanciaTotalKm: z.number().nonnegative(),
  tempoEstimadoMin: z.number().int().nonnegative(),
  tempoRealMin: z.number().int().nonnegative().optional(),
  entregues: z.number().int().nonnegative().default(0),
  problemas: z.number().int().nonnegative().default(0),
  canceladas: z.number().int().nonnegative().default(0),
  ganhoEstimado: z.number().nonnegative().default(0),
  economiaVsManual: z.number().nonnegative().default(0),
});

export type MetricasRota = z.infer<typeof MetricasRotaSchema>;

export const insertRotaSchema = createInsertSchema(rotas, {
  waypoints: z.array(WaypointSchema).default([]),
  geometry: z.any().optional(),
  metricas: MetricasRotaSchema.optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectRotaSchema = createSelectSchema(rotas);
export type Rota = z.infer<typeof selectRotaSchema>;
export type NewRota = z.infer<typeof insertRotaSchema>;