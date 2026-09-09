import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReadQuery } from '../src/sql-validator.js';

test('accepts one SELECT, CTE, UNION, and VALUES statement', () => {
  for (const sql of [
    'SELECT id, full_name FROM customers',
    'SELECT COUNT(*) AS total_orders FROM public.orders;',
    'WITH recent AS (SELECT id FROM orders) SELECT * FROM recent',
    'SELECT 1 UNION ALL SELECT 2',
    'VALUES (1), (2)'
  ]) assert.doesNotThrow(() => validateReadQuery(sql));
});

test('rejects write and DDL statements', () => {
  for (const sql of [
    'INSERT INTO customers(full_name) VALUES (\'x\')',
    'UPDATE customers SET full_name=\'x\'',
    'DELETE FROM customers',
    'DROP TABLE customers',
    'ALTER TABLE customers ADD COLUMN unsafe int',
    'TRUNCATE customers',
    'CREATE TABLE unsafe(id int)'
  ]) assert.throws(() => validateReadQuery(sql), /not allowed/);

  // The parser version does not model SQL procedure CALL statements, so CALL
  // is rejected even earlier as invalid SQL rather than reaching PostgreSQL.
  assert.throws(
    () => validateReadQuery('CALL rebuild_reporting_tables()'),
    (error) => ['INVALID_SQL', 'READ_ONLY_VIOLATION'].includes(error.code)
  );
});

test('rejects multiple statements and write CTEs', () => {
  assert.throws(() => validateReadQuery('SELECT 1; SELECT 2'), /Exactly one/);
  assert.throws(() => validateReadQuery('SELECT 1; DELETE FROM customers'), /Exactly one/);
  assert.throws(
    () => validateReadQuery('WITH changed AS (DELETE FROM customers RETURNING id) SELECT * FROM changed'),
    /not allowed/
  );
});

test('rejects schemas outside source allowlist and selected costly functions', () => {
  assert.throws(() => validateReadQuery('SELECT * FROM private.payroll', ['public']), /not allowed/);
  assert.throws(() => validateReadQuery('SELECT pg_sleep(10)'), /not allowed/);
});
