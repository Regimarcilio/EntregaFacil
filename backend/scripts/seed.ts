#!/usr/bin/env tsx
/**
 * Database Seed Script
 * Popula o banco com dados de desenvolvimento
 */

import { createPool, getDB, closePool } from '../db';
import { motoristas } from '../db/schema/motoristas';
import { veiculos } from '../db/schema/veiculos';
import { enderecos } from '../db/schema/enderecos';
import { rotas } from '../db/schema/rotas';
import { logger } from '../utils/logger';
import crypto from 'crypto';

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function hashCPF(cpf: string): string {
  return crypto.createHash('sha256').update(cpf).digest('hex');
}

async function seed() {
  logger.info('🌱 Iniciando seed do banco de dados...');

  const pool = createPool();
  const db = getDB();

  try {
    // Verifica se já existem dados
    const [existing] = await db.select({ count: sql`count(*)` }).from(motoristas);
    if (Number(existing.count) > 0) {
      logger.info('Banco já possui dados, pulando seed');
      return;
    }

    // 1. Cria motorista de teste
    const passwordHash = await hashPassword('123456');
    const cpfHash = hashCPF('12345678901');

    const [motorista] = await db
      .insert(motoristas)
      .values({
        nome: 'Carlos Silva',
        email: 'carlos@entregafacil.app',
        passwordHash,
        telefone: '+5511999998888',
        cpfHash,
        preferencias: {
          tema: 'sistema',
          unidades: 'metric',
          vozNavegacao: true,
          volumeVoz: 80,
          modoLuva: false,
          autoIniciarNavegacao: true,
          syncApenasWifi: true,
          notificacoesPush: true,
        },
        whatsappConfig: null,
        emailVerified: true,
      })
      .returning();

    logger.info({ motoristaId: motorista.id }, 'Motorista criado');

    // 2. Cria veículo
    await db.insert(veiculos).values({
      motoristaId: motorista.id,
      placa: 'ABC1D23',
      modelo: 'Honda CG 160',
      cor: 'Vermelha',
      ano: 2022,
      tipo: 'moto',
      isDefault: true,
    });

    logger.info('Veículo criado');

    // 3. Cria endereços de teste (São Paulo)
    const enderecosTeste = [
      {
        nome: 'Restaurante A',
        enderecoFormatado: 'Rua Augusta, 500 - Consolação, São Paulo - SP, 01305-000',
        latitude: -23.5613,
        longitude: -46.6565,
        cep: '01305000',
        bairro: 'Consolação',
        cidade: 'São Paulo',
        estado: 'SP',
        destinatario: { nome: 'João Silva', telefone: '+5511988887777', notificar: 'sempre' as const },
      },
      {
        nome: 'Restaurante B',
        enderecoFormatado: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100',
        latitude: -23.5733,
        longitude: -46.6417,
        cep: '01310100',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
        destinatario: { nome: 'Maria Santos', telefone: '+5511977776666', notificar: 'sempre' as const },
      },
      {
        nome: 'Cliente 1',
        enderecoFormatado: 'Rua Oscar Freire, 800 - Pinheiros, São Paulo - SP, 05409-010',
        latitude: -23.5678,
        longitude: -46.6892,
        cep: '05409010',
        bairro: 'Pinheiros',
        cidade: 'São Paulo',
        estado: 'SP',
        destinatario: { nome: 'Pedro Oliveira', telefone: '+5511966665555', notificar: 'apenas_problema' as const },
      },
      {
        nome: 'Cliente 2',
        enderecoFormatado: 'Av. Faria Lima, 2000 - Itaim Bibi, São Paulo - SP, 04538-132',
        latitude: -23.5882,
        longitude: -46.6831,
        cep: '04538132',
        bairro: 'Itaim Bibi',
        cidade: 'São Paulo',
        estado: 'SP',
        destinatario: { nome: 'Ana Costa', telefone: '+5511955554444', notificar: 'sempre' as const },
      },
      {
        nome: 'Cliente 3',
        enderecoFormatado: 'Rua da Consolação, 2000 - Cerqueira César, São Paulo - SP, 01416-000',
        latitude: -23.5584,
        longitude: -46.6602,
        cep: '01416000',
        bairro: 'Cerqueira César',
        cidade: 'São Paulo',
        estado: 'SP',
        destinatario: { nome: 'Lucas Ferreira', telefone: '+5511944443333', notificar: 'nunca' as const },
      },
    ];

    const enderecosInseridos = await db
      .insert(enderecos)
      .values(
        enderecosTeste.map((e) => ({
          ...e,
          motoristaId: motorista.id,
        }))
      )
      .returning();

    logger.info({ count: enderecosInseridos.length }, 'Endereços criados');

    // 4. Cria rota de exemplo
    const waypoints = enderecosInseridos.map((e, i) => ({
      id: crypto.randomUUID(),
      rotaId: '', // será preenchido depois
      enderecoId: e.id,
      ordem: i,
      status: 'pendente' as const,
      latitude: e.latitude,
      longitude: e.longitude,
      enderecoNome: e.nome,
      enderecoFormatado: e.enderecoFormatado,
    }));

    const [rota] = await db
      .insert(rotas)
      .values({
        motoristaId: motorista.id,
        veiculoId: (await db.select({ id: veiculos.id }).from(veiculos).where(eq(veiculos.motoristaId, motorista.id)).limit(1))[0]?.id,
        nome: 'Rota Teste - Centro SP',
        data: new Date(),
        status: 'rascunho',
        waypoints,
      })
      .returning();

    // Atualiza waypoints com rotaId
    const updatedWaypoints = waypoints.map(w => ({ ...w, rotaId: rota.id }));
    await db
      .update(rotas)
      .set({ waypoints: updatedWaypoints })
      .where(eq(rotas.id, rota.id));

    logger.info({ rotaId: rota.id }, 'Rota de teste criada');

    logger.info('✅ Seed concluído com sucesso!');
    logger.info('📧 Login de teste: carlos@entregafacil.app / 123456');

  } catch (error) {
    logger.error({ err: error }, 'Erro no seed');
    throw error;
  } finally {
    await closePool();
  }
}

// Import sql for count
import { sql, eq } from 'drizzle-orm';

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});