import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import { logger } from '../utils/logger';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function createPool(): pg.Pool {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  pool = new Pool({
    connectionString: databaseUrl,
    max: parseInt(process.env.DATABASE_POOL_SIZE || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected database pool error');
  });

  pool.on('connect', () => {
    logger.debug('New database connection established');
  });

  return pool;
}

export function getPool(): pg.Pool {
  if (!pool) {
    return createPool();
  }
  return pool;
}

export function getDB(): ReturnType<typeof drizzle<typeof schema>> {
  if (!db) {
    db = drizzle(getPool(), { schema, logger: false });
  }
  return db;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
    logger.info('Database pool closed');
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT 1 as health');
    return result.rows[0]?.health === 1;
  } catch (error) {
    logger.error({ err: error }, 'Database health check failed');
    return false;
  }
}

export { schema };
export type DB = ReturnType<typeof drizzle<typeof schema>>;