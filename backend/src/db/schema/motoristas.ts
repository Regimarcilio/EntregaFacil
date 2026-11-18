import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const motoristas = pgTable(
  'motoristas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: varchar('nome', { length: 100 }).notNull(),
    cpfHash: varchar('cpf_hash', { length: 64 }).notNull().unique(),
    telefone: varchar('telefone', { length: 20 }).notNull(),
    email: varchar('email', { length: 100 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    fotoUrl: varchar('foto_url', { length: 500 }),
    preferencias: jsonb('preferencias').$type<Preferencias>().notNull().default({}),
    whatsappConfig: jsonb('whatsapp_config').$type<WhatsAppConfig>(),
    isActive: boolean('is_active').notNull().default(true),
    emailVerified: boolean('email_verified').notNull().default(false),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [
    index('idx_motoristas_email').on(t.email),
    index('idx_motoristas_cpf_hash').on(t.cpfHash),
    index('idx_motoristas_active').on(t.isActive),
  ]
);

export const PreferenciasSchema = z.object({
  tema: z.enum(['claro', 'escuro', 'sistema']).default('sistema'),
  unidades: z.enum(['metric', 'imperial']).default('metric'),
  vozNavegacao: z.boolean().default(true),
  volumeVoz: z.number().min(0).max(100).default(80),
  modoLuva: z.boolean().default(false),
  autoIniciarNavegacao: z.boolean().default(true),
  syncApenasWifi: z.boolean().default(true),
  notificacoesPush: z.boolean().default(true),
});

export type Preferencias = z.infer<typeof PreferenciasSchema>;

export const WhatsAppConfigSchema = z.object({
  evolutionUrl: z.string().url(),
  apiKey: z.string().min(1),
  instanceName: z.string().min(1),
  remetente: z.enum(['motorista', 'destinatario']).default('destinatario'),
  templatePadrao: z.string().default('entrega_confirmada'),
  statusConexao: z.enum(['conectado', 'desconectado', 'pareando']).default('desconectado'),
});

export type WhatsAppConfig = z.infer<typeof WhatsAppConfigSchema>;

export const insertMotoristaSchema = createInsertSchema(motoristas, {
  cpfHash: z.string().length(64),
  passwordHash: z.string().min(60),
  preferencias: PreferenciasSchema.optional(),
  whatsappConfig: WhatsAppConfigSchema.optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  emailVerified: true,
  lastLoginAt: true,
  isActive: true,
});

export const selectMotoristaSchema = createSelectSchema(motoristas);
export type Motorista = z.infer<typeof selectMotoristaSchema>;
export type NewMotorista = z.infer<typeof insertMotoristaSchema>;