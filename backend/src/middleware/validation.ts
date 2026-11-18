import { createMiddleware } from 'hono/factory';
import { z } from 'zod';
import { logger } from '../utils/logger';

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return createMiddleware(async (c, next) => {
    try {
      const body = await c.req.json();
      const result = schema.safeParse(body);

      if (!result.success) {
        logger.warn({ errors: result.error.flatten() }, 'Validation failed');
        return c.json(
          {
            error: 'Dados inválidos',
            details: result.error.flatten().fieldErrors,
          },
          400
        );
      }

      c.set('validatedBody', result.data);
      await next();
    } catch (error) {
      logger.error({ err: error }, 'Body parsing failed');
      return c.json({ error: 'Corpo da requisição inválido' }, 400);
    }
  });
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return createMiddleware(async (c, next) => {
    try {
      const query = c.req.query();
      const result = schema.safeParse(query);

      if (!result.success) {
        return c.json(
          {
            error: 'Parâmetros de query inválidos',
            details: result.error.flatten().fieldErrors,
          },
          400
        );
      }

      c.set('validatedQuery', result.data);
      await next();
    } catch (error) {
      return c.json({ error: 'Query parsing failed' }, 400);
    }
  });
}

export function validateParam<T extends z.ZodTypeAny>(schema: T, paramName: string) {
  return createMiddleware(async (c, next) => {
    try {
      const param = c.req.param(paramName);
      const result = schema.safeParse(param);

      if (!result.success) {
        return c.json(
          {
            error: `Parâmetro ${paramName} inválido`,
            details: result.error.flatten().fieldErrors,
          },
          400
        );
      }

      c.set(`validatedParam_${paramName}`, result.data);
      await next();
    } catch (error) {
      return c.json({ error: 'Parameter validation failed' }, 400);
    }
  });
}

// Common validation schemas
export const uuidParam = z.string().uuid('ID deve ser um UUID válido');
export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;