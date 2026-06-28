import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
  // Forzar IPv4: algunos hosts (Supabase) resuelven a IPv6 pero Railway no puede rutearlo
  family: 4,
});

pool.on('error', (err) => {
  console.error('[Nexus Backend] Error inesperado en el pool de PostgreSQL:', err);
});

export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (config.nodeEnv === 'development') {
    console.log('[Nexus Debug] Query ejecutada:', { text: text.slice(0, 120), rows: result.rowCount, duration });
  }
  return result;
}
