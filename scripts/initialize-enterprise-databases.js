import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { settings, connectionConfig } from '../src/config.js';

const targets = ['hrms_db', 'crm_db', 'erp_db'];
const requested = process.argv[2] ?? 'all';
const selected = requested === 'all' ? targets : [requested];
if (!selected.every((id) => targets.includes(id))) throw new Error('Use all, hrms_db, crm_db, or erp_db');

const bootstrapSource = settings.sources.find((source) => source.id === 'ecommerce_db');
const bootstrapConfig = connectionConfig(bootstrapSource);
const adminConfig = {
  host: process.env.POSTGRES_ADMIN_HOST ?? bootstrapConfig.host,
  port: Number(process.env.POSTGRES_ADMIN_PORT ?? bootstrapConfig.port),
  database: 'postgres',
  user: process.env.POSTGRES_ADMIN_USER ?? bootstrapConfig.user,
  password: String(process.env.POSTGRES_ADMIN_PASSWORD ?? bootstrapConfig.password),
  ssl: bootstrapConfig.ssl
};

function sql(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\\set.*$/gm, '');
}

const admin = new pg.Pool(adminConfig);
try {
  for (const id of selected) {
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [id]);
    if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${id}"`);
    const pool = new pg.Pool({ ...adminConfig, database: id });
    try {
      for (const filename of ['schema.sql', 'seed.sql', 'analytics_readonly.sql']) {
        await pool.query(sql(path.join('database', id.replace('_db', ''), filename)));
      }
      await pool.query('ANALYZE');
      const counts = await pool.query(`SELECT relname AS table_name,n_live_tup::bigint AS estimated_rows
        FROM pg_stat_user_tables ORDER BY relname`);
      process.stdout.write(`${JSON.stringify({ database: id, initialized: true, tables: counts.rows })}\n`);
    } finally { await pool.end(); }
  }
} finally { await admin.end(); }
