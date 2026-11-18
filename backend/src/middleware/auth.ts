import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import { getDB } from '../db';
import { motoristas } from '../db/schema/motoristas';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

export interface JWTPayload {
  sub: string;
  email: string;
  role: 'driver' | 'admin';
  iat: number;
  exp: number;
}

export interface AuthVariables {
  user: {
    id: string;
    email: string;
    role: 'driver' | 'admin';
    motoristaId: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set');
}
if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters for HS256');
}

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Token de autorização não fornecido' }, 401);
    }

    const token = authHeader.slice(7);

    try {
      const payload = (await verify(token, JWT_SECRET)) as JWTPayload;

      if (!payload.sub || !payload.email) {
        return c.json({ error: 'Token inválido' }, 401);
      }

      // Verifica se o motorista ainda existe e está ativo
      const db = getDB();
      const [motorista] = await db
        .select({ id: motoristas.id, email: motoristas.email, isActive: motoristas.isActive })
        .from(motoristas)
        .where(eq(motoristas.id, payload.sub))
        .limit(1);

      if (!motorista || !motorista.isActive) {
        return c.json({ error: 'Usuário não encontrado ou inativo' }, 401);
      }

      // Adiciona info do usuário ao contexto
      c.set('user', {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        motoristaId: payload.sub,
      });

      await next();
    } catch (error) {
      logger.warn({ err: error }, 'JWT verification failed');
      return c.json({ error: 'Token inválido ou expirado' }, 401);
    }
  }
);

export const adminMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const user = c.get('user');

    if (user.role !== 'admin') {
      return c.json({ error: 'Acesso negado: privilégios de administrador necessários' }, 403);
    }

    await next();
  }
);

export async function generateTokens(userId: string, email: string, role: 'driver' | 'admin') {
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(JWT_SECRET);

  const accessToken = await new SignJWT({ sub: userId, email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);

  const refreshToken = await new SignJWT({ sub: userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);

  return { accessToken, refreshToken };
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string; type: string } | null> {
  try {
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as { sub: string; type: string };
  } catch {
    return null;
  }
}