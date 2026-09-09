import pg from 'pg';
import { settings, connectionConfig } from '../src/config.js';

const source = settings.sources.find((item) => item.id === 'ecommerce_db');
if (!source) throw new Error('ecommerce_db is not registered');
const pool = new pg.Pool(connectionConfig(source));

try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN TRANSACTION READ ONLY');
    const columns = await client.query(`
      SELECT table_name, ordinal_position, column_name, data_type, udt_name,
             is_nullable, column_default, is_identity
      FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name=ANY($1::text[])
      ORDER BY table_name, ordinal_position`,
      [['customers','products','orders','order_items','payments']]);
    const constraints = await client.query(`
      SELECT c.relname AS table_name, con.conname,
             pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class c ON c.oid=con.conrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=ANY($1::text[])
      ORDER BY c.relname, con.conname`,
      [['customers','products','orders','order_items','payments']]);
    const runtime = await client.query(`
      SELECT current_user,
             col_description('public.payments'::regclass,
               (SELECT attnum FROM pg_attribute
                WHERE attrelid='public.payments'::regclass AND attname='status')) IS NOT NULL
               AS payments_status_has_description`);
    const counts = await client.query(`
      SELECT 'customers' AS table_name,count(*) AS rows FROM public.customers
      UNION ALL SELECT 'products',count(*) FROM public.products
      UNION ALL SELECT 'orders',count(*) FROM public.orders
      UNION ALL SELECT 'order_items',count(*) FROM public.order_items
      UNION ALL SELECT 'payments',count(*) FROM public.payments`);
    const contents = {};
    for (const table of ['customers','products','orders','order_items','payments']) {
      contents[table] = (await client.query(`SELECT * FROM public.${table} ORDER BY id LIMIT 500`)).rows;
    }
    process.stdout.write(`${JSON.stringify({ runtime: runtime.rows[0], columns: columns.rows, constraints: constraints.rows, counts: counts.rows, contents }, null, 2)}\n`);
    await client.query('COMMIT');
  } finally { client.release(); }
} finally { await pool.end(); }
