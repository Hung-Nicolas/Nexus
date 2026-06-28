import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

function parseConnectionString(url) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port || 5432,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    };
  } catch (err) {
    console.error('[Nexus Backend] DATABASE_URL inválida:', err.message);
    throw err;
  }
}

const dbConfig = parseConnectionString(config.databaseUrl);

export const pool = new Pool({
  ...dbConfig,
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
