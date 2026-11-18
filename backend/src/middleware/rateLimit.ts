import { createMiddleware } from 'hono/factory';
import { getRedis } from '../services/redis';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  windowMs: 60000, // 1 minuto
  max: 100, // 100 requests por janela
  keyPrefix: 'ratelimit',
};

export function rateLimiter(options: Partial<RateLimitOptions> = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return createMiddleware(async (c, next) => {
    const redis = getRedis();
    if (!redis) {
      // Se não tem Redis, pula rate limiting (desenvolvimento)
      return next();
    }

    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
               c.req.header('x-real-ip') ||
               'unknown';
    const key = `${opts.keyPrefix}:${ip}`;

    try {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.pexpire(key, opts.windowMs);
      }

      const ttl = await redis.pttl(key);
      const remaining = Math.max(0, opts.max - current);

      c.header('X-RateLimit-Limit', opts.max.toString());
      c.header('X-RateLimit-Remaining', remaining.toString());
      c.header('X-RateLimit-Reset', new Date(Date.now() + ttl).toISOString());

      if (current > opts.max) {
        return c.json(
          {
            error: 'Muitas requisições. Tente novamente mais tarde.',
            retryAfter: Math.ceil(ttl / 1000),
          },
          429
        );
      }

      await next();
    } catch (error) {
      // Em caso de erro no Redis, permite a requisição (fail-open)
      console.error('Rate limiter error:', error);
      await next();
    }
  });
}

// Rate limiter mais estrito para auth
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas por 15 min
  keyPrefix: 'ratelimit:auth',
});

// Rate limiter para API geral
export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  keyPrefix: 'ratelimit:api',
});

// Rate limiter para sync (mais permissivo)
export const syncRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: 'ratelimit:sync',
});