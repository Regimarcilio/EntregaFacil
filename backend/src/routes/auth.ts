import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDB } from '../db';
import { motoristas } from '../db/schema/motoristas';
import { veiculos } from '../db/schema/veiculos';
import { eq } from 'drizzle-orm';
import { generateTokens, verifyRefreshToken } from '../middleware/auth';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const auth = new Hono();

// Schemas
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const registerSchema = z.object({
  nome: z.string().min(2).max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  telefone: z.string().regex(/^\+?55\d{10,11}$/, 'Telefone deve estar no formato brasileiro com DDD'),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos'),
  veiculo: z.object({
    placa: z.string().regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i),
    modelo: z.string().min(1).max(50),
    cor: z.string().max(30).optional(),
    ano: z.number().int().min(1990).max(new Date().getFullYear() + 1).optional(),
    tipo: z.enum(['moto', 'carro', 'bike']),
  }).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// Helper: hash password
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Helper: verify password
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === computedHash;
}

// Helper: hash CPF
function hashCPF(cpf: string): string {
  return crypto.createHash('sha256').update(cpf).digest('hex');
}

// POST /auth/login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const db = getDB();

  const [motorista] = await db
    .select()
    .from(motoristas)
    .where(eq(motoristas.email, email))
    .limit(1);

  if (!motorista || !motorista.isActive) {
    return c.json({ error: 'Credenciais inválidas' }, 401);
  }

  const isValid = await verifyPassword(password, motorista.passwordHash);
  if (!isValid) {
    logger.warn({ email }, 'Invalid login attempt');
    return c.json({ error: 'Credenciais inválidas' }, 401);
  }

  const { accessToken, refreshToken } = await generateTokens(
    motorista.id,
    motorista.email,
    'driver'
  );

  // Atualiza last login
  await db
    .update(motoristas)
    .set({ lastLoginAt: new Date() })
    .where(eq(motoristas.id, motorista.id));

  logger.info({ motoristaId: motorista.id }, 'User logged in');

  return c.json({
    user: {
      id: motorista.id,
      nome: motorista.nome,
      email: motorista.email,
      telefone: motorista.telefone,
      preferencias: motorista.preferencias,
      whatsappConfig: motorista.whatsappConfig,
    },
    token: accessToken,
    refreshToken,
  });
});

// POST /auth/register
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const data = c.req.valid('json');
  const db = getDB();

  // Verifica se email já existe
  const [existingEmail] = await db
    .select({ id: motoristas.id })
    .from(motoristas)
    .where(eq(motoristas.email, data.email))
    .limit(1);

  if (existingEmail) {
    return c.json({ error: 'Email já cadastrado' }, 409);
  }

  // Verifica CPF
  const cpfHash = hashCPF(data.cpf);
  const [existingCPF] = await db
    .select({ id: motoristas.id })
    .from(motoristas)
    .where(eq(motoristas.cpfHash, cpfHash))
    .limit(1);

  if (existingCPF) {
    return c.json({ error: 'CPF já cadastrado' }, 409);
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Cria motorista
  const [motorista] = await db
    .insert(motoristas)
    .values({
      nome: data.nome,
      email: data.email,
      passwordHash,
      telefone: data.telefone,
      cpfHash,
      preferencias: {},
    })
    .returning();

  // Cria veículo se fornecido
  if (data.veiculo) {
    await db.insert(veiculos).values({
      motoristaId: motorista.id,
      placa: data.veiculo.placa.toUpperCase(),
      modelo: data.veiculo.modelo,
      cor: data.veiculo.cor,
      ano: data.veiculo.ano,
      tipo: data.veiculo.tipo,
      isDefault: true,
    });
  }

  const { accessToken, refreshToken } = await generateTokens(
    motorista.id,
    motorista.email,
    'driver'
  );

  logger.info({ motoristaId: motorista.id }, 'New user registered');

  return c.json(
    {
      user: {
        id: motorista.id,
        nome: motorista.nome,
        email: motorista.email,
        telefone: motorista.telefone,
        preferencias: {},
        whatsappConfig: null,
      },
      token: accessToken,
      refreshToken,
    },
    201
  );
});

// POST /auth/refresh
auth.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid('json');

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload || payload.type !== 'refresh') {
    return c.json({ error: 'Refresh token inválido' }, 401);
  }

  const db = getDB();
  const [motorista] = await db
    .select({ id: motoristas.id, email: motoristas.email, isActive: motoristas.isActive })
    .from(motoristas)
    .where(eq(motoristas.id, payload.sub))
    .limit(1);

  if (!motorista || !motorista.isActive) {
    return c.json({ error: 'Usuário não encontrado ou inativo' }, 401);
  }

  const { accessToken, refreshToken: newRefreshToken } = await generateTokens(
    motorista.id,
    motorista.email,
    'driver'
  );

  return c.json({ token: accessToken, refreshToken: newRefreshToken });
});

// POST /auth/logout
auth.post('/logout', async (c) => {
  // Em implementação completa, invalidaria o refresh token no Redis
  // Por enquanto, apenas retorna sucesso (cliente deve descartar tokens)
  return c.json({ message: 'Logout realizado com sucesso' });
});

// GET /auth/me
auth.get('/me', async (c) => {
  const user = c.get('user');
  const db = getDB();

  const [motorista] = await db
    .select({
      id: motoristas.id,
      nome: motoristas.nome,
      email: motoristas.email,
      telefone: motoristas.telefone,
      fotoUrl: motoristas.fotoUrl,
      preferencias: motoristas.preferencias,
      whatsappConfig: motoristas.whatsappConfig,
      createdAt: motoristas.createdAt,
    })
    .from(motoristas)
    .where(eq(motoristas.id, user.motoristaId))
    .limit(1);

  if (!motorista) {
    return c.json({ error: 'Usuário não encontrado' }, 404);
  }

  // Busca veículo padrão
  const [veiculo] = await db
    .select()
    .from(veiculos)
    .where(eq(veiculos.motoristaId, motorista.id))
    .limit(1);

  return c.json({ user: { ...motorista, veiculo } });
});

export default auth;