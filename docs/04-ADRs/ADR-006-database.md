# ADR-006: Database — PostgreSQL + PostGIS + Drizzle ORM

**Status:** Accepted  
**Data:** 2026-11-17  
**Autor:** PLANMASTER

## Contexto
Backend precisa armazenar:
- Dados geoespaciais (rotas, waypoints, heatmaps, isochrones)
- Dados relacionais (motoristas, endereços, entregas, comprovações)
- JSONB flexível (preferências, templates, configs)
- ACID transactions (sync, pagamentos futuros)
- Type-safe ORM com inferência TypeScript

## Decisão
**PostgreSQL 16 + PostGIS 3.5** com **Drizzle ORM** (type-safe, SQL-like, zero runtime overhead).

## Alternativas Consideradas

| Opção | Geoespacial | ACID | Type-Safe | Performance | Veredito |
|-------|-------------|------|-----------|-------------|----------|
| **PostgreSQL + PostGIS + Drizzle (Escolhido)** | ✅ Nativo (ST_*) | ✅ | ✅ Inferência TS | Excelente | ✅ |
| MongoDB | ✅ 2dsphere | ⚠️ Eventual | ❌ Runtime | Boa | ❌ |
| SQLite + SpatiaLite | ✅ | ✅ | ❌ | Local only | ❌ |
| Prisma + PostgreSQL | ✅ | ✅ | ✅ | Overhead runtime | ⚠️ |
| Supabase (PostgreSQL managed) | ✅ | ✅ | ✅ | Boa | ⚠️ Vendor |

## Consequências

### Positivas
- **PostGIS**: Queries geoespaciais nativas (`ST_DWithin`, `ST_MakeLine`, `ST_Distance`, `ST_Contains`, `ST_ClusterDBSCAN`)
- **Drizzle**: Zero runtime overhead, inferência TypeScript perfeita, migrations SQL nativas, `drizzle-kit` CLI
- **JSONB**: Preferências, templates, configs flexíveis sem schema rígido
- **Partitioning**: Tabelas grandes (`deliveries`, `whatsapp_logs`) particionadas por data
- **Replicação**: Streaming replication para read replicas (futuro)

### Negativas/Riscos
- **Extensão PostGIS**: Adiciona complexidade no Docker (imagem `postgis/postgis` ou script init)
- **Migrações**: Requer cuidado com extensões (`CREATE EXTENSION postgis`)

## Schema Principal (Drizzle)

```typescript
// db/schema.ts
import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, doublePrecision, integer, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

// Enums
const routeStatusEnum = pgEnum('route_status', ['rascunho', 'otimizada', 'em_andamento', 'concluida', 'parcial', 'cancelada']);
const waypointStatusEnum = pgEnum('waypoint_status', ['pendente', 'em_rota', 'entregue', 'problema', 'cancelada']);
const problemTypeEnum = pgEnum('problem_type', ['cliente_ausente', 'endereco_errado', 'recusou', 'outro']);
const notificationPrefEnum = pgEnum('notification_pref', ['sempre', 'nunca', 'apenas_problema']);
const whatsappStatusEnum = pgEnum('whatsapp_status', ['enviado', 'entregue', 'lido', 'erro']);
const syncStatusEnum = pgEnum('sync_status', ['pendente', 'processando', 'concluido', 'erro', 'conflito']);

// Tables
export const motoristas = pgTable('motoristas', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: varchar('nome', { length: 100 }).notNull(),
  cpfHash: varchar('cpf_hash', { length: 64 }).notNull().unique(),
  telefone: varchar('telefone', { length: 20 }).notNull(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  fotoUrl: varchar('foto_url', { length: 500 }),
  preferencias: jsonb('preferencias').$type<Preferencias>().notNull().default({}),
  whatsappConfig: jsonb('whatsapp_config').$type<WhatsAppConfig>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (t) => [
  index('idx_motoristas_email').on(t.email),
  index('idx_motoristas_cpf_hash').on(t.cpfHash),
]);

export const veiculos = pgTable('veiculos', {
  id: uuid('id').primaryKey().defaultRandom(),
  motoristaId: uuid('motorista_id').references(() => motoristas.id).notNull(),
  placa: varchar('placa', { length: 8 }).notNull().unique(),
  modelo: varchar('modelo', { length: 50 }).notNull(),
  cor: varchar('cor', { length: 30 }),
  ano: integer('ano'),
  tipo: varchar('tipo', { length: 10 }).notNull(), // moto, carro, bike
  crlvUrl: varchar('crlv_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_veiculos_motorista').on(t.motoristaId),
]);

export const enderecos = pgTable('enderecos', {
  id: uuid('id').primaryKey().defaultRandom(),
  motoristaId: uuid('motorista_id').references(() => motoristas.id).notNull(),
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
}, (t) => [
  index('idx_enderecos_motorista').on(t.motoristaId),
  index('idx_enderecos_geo').on(t.latitude, t.longitude),
]);

export const rotas = pgTable('rotas', {
  id: uuid('id').primaryKey().defaultRandom(),
  motoristaId: uuid('motorista_id').references(() => motoristas.id).notNull(),
  veiculoId: uuid('veiculo_id').references(() => veiculos.id).notNull(),
  nome: varchar('nome', { length: 100 }).notNull(),
  data: timestamp('data').notNull(),
  status: routeStatusEnum('status').notNull().default('rascunho'),
  waypoints: jsonb('waypoints').$type<Waypoint[]>().notNull().default([]),
  geometry: jsonb('geometry').$type<GeoJSON.LineString>(), // Polyline GeoJSON
  metricas: jsonb('metricas').$type<MetricasRota>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('idx_rotas_motorista_data').on(t.motoristaId, t.data),
  index('idx_rotas_status').on(t.status),
]);

export const entregas = pgTable('entregas', {
  id: uuid('id').primaryKey().defaultRandom(),
  rotaId: uuid('rota_id').references(() => rotas.id).notNull(),
  waypointId: uuid('waypoint_id').notNull(), // UUID do waypoint na rota
  enderecoId: uuid('endereco_id').references(() => enderecos.id).notNull(),
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
}, (t) => [
  index('idx_entregas_rota').on(t.rotaId),
  index('idx_entregas_timestamp').on(t.timestamp),
]);

export const whatsappLogs = pgTable('whatsapp_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  entregaId: uuid('entrega_id').references(() => entregas.id).notNull(),
  messageId: varchar('message_id', { length: 100 }).notNull(),
  destinatarioNome: varchar('destinatario_nome', { length: 100 }).notNull(),
  telefone: varchar('telefone', { length: 20 }).notNull(),
  templateUsado: varchar('template_usado', { length: 50 }).notNull(),
  status: whatsappStatusEnum('status').notNull().default('enviado'),
  enviadoEm: timestamp('enviado_em').defaultNow().notNull(),
  entregueEm: timestamp('entregue_em'),
  lidoEm: timestamp('lido_em'),
  erro: text('erro'),
}, (t) => [
  index('idx_whatsapp_logs_entrega').on(t.entregaId),
  index('idx_whatsapp_logs_message_id').on(t.messageId),
]);

export const syncQueue = pgTable('sync_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  motoristaId: uuid('motorista_id').references(() => motoristas.id).notNull(),
  operacaoId: uuid('operacao_id').notNull().unique(),
  tipo: varchar('tipo', { length: 10 }).notNull(), // create, update, delete
  entidade: varchar('entidade', { length: 50 }).notNull(),
  payload: jsonb('payload').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  tentativas: integer('tentativas').notNull().default(0),
  status: syncStatusEnum('status').notNull().default('pendente'),
  erro: text('erro'),
  resolvidoEm: timestamp('resolvido_em'),
}, (t) => [
  index('idx_sync_queue_motorista_status').on(t.motoristaId, t.status),
  uniqueIndex('uq_sync_queue_operacao').on(t.operacaoId),
]);

// Zod schemas for validation
export const insertMotoristaSchema = createInsertSchema(motoristas);
export const insertRotaSchema = createInsertSchema(rotas);
export const insertEntregaSchema = createInsertSchema(entregas);
// ...
```

## Queries Geoespaciais Comuns

```sql
-- Waypoints próximos (raio 500m)
SELECT * FROM enderecos 
WHERE ST_DWithin(
  ST_MakePoint(longitude, latitude)::geography,
  ST_MakePoint(-46.6333, -23.5505)::geography,
  500
);

-- Rota como LineString para MapLibre
SELECT ST_AsGeoJSON(ST_MakeLine(ARRAY[
  ST_MakePoint(lng, lat) ORDER BY ordem
])) FROM jsonb_to_recordset(waypoints) AS w(ordem INT, lat DOUBLE PRECISION, lng DOUBLE PRECISION)
WHERE rota_id = $1;

-- Heatmap entregas (cluster)
SELECT ST_ClusterDBSCAN(ST_MakePoint(longitude, latitude)::geography, 100, 5) 
FROM entregas WHERE motorista_id = $1 AND timestamp > NOW() - INTERVAL '30 days';

-- Distância total rota (metros)
SELECT SUM(ST_Distance(
  ST_MakePoint(lag_lng, lag_lat)::geography,
  ST_MakePoint(lng, lat)::geography
)) FROM (
  SELECT lat, lng, LAG(lat) OVER (ORDER BY ordem) as lag_lat, LAG(lng) OVER (ORDER BY ordem) as lag_lng
  FROM jsonb_to_recordset(waypoints) AS w(ordem INT, lat DOUBLE PRECISION, lng DOUBLE PRECISION)
  WHERE rota_id = $1
) sub WHERE lag_lat IS NOT NULL;
```

## Validação
- [ ] Schema Drizzle gera migrações SQL corretas (`drizzle-kit generate`)
- [ ] PostGIS extension instalada no Docker (`CREATE EXTENSION postgis;`)
- [ ] Queries geoespaciais performáticas (< 50ms p95 com índices GiST)
- [ ] Partitioning `entregas` por mês implementado
- [ ] Backup/restore testado (pg_dump + pg_restore)
- [ ] TypeScript types inferidos corretamente (`drizzle-kit studio`)

## Referências
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [PostGIS Reference](https://postgis.net/docs/manual-3.5/)
- [Benchmarks](docs/02-benchmarks.md#5-backend--sync--database--comparativo)