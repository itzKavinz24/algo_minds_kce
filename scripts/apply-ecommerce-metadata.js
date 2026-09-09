import fs from 'node:fs';
import pg from 'pg';
import { settings, connectionConfig } from '../src/config.js';

const source = settings.sources.find((item) => item.id === 'ecommerce_db');
if (!source) throw new Error('ecommerce_db is not registered');
const pool = new pg.Pool(connectionConfig(source));
try {
  await pool.query(fs.readFileSync('database/ecommerce/06_metadata_comments.sql', 'utf8')
    .replace(/^\\set.*$/gm, ''));
  process.stderr.write('E-Commerce metadata comments applied.\n');
} finally {
  await pool.end();
}
