import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { QueryService } from '../src/query-service.js';

const url = process.env.TEST_DATABASE_URL;
const integration = url ? test : test.skip;

integration('executes reads, caps rows, validates columns, and blocks writes in PostgreSQL', async () => {
  const pool = new pg.Pool({ connectionString: url });
  const source = { id: 'test', schemas: ['public'] };
  const registry = { source: () => source, pool: () => pool };
  const logger = { info() {}, warn() {} };
  const service = new QueryService(registry, { maxRows: 2, queryTimeoutMs: 1000 }, logger);
  try {
    const result = await service.execute('test', 'SELECT * FROM (VALUES (1),(2),(3)) AS t(n) ORDER BY n');
    assert.deepEqual(result.rows, [{ n: 1 }, { n: 2 }]);
    assert.equal(result.truncated, true);
    await assert.rejects(() => service.execute('test', 'SELECT missing_column FROM customers'), /unknown/i);
    await assert.rejects(() => service.execute('test', 'DELETE FROM customers'), /not allowed/i);
  } finally {
    await pool.end();
  }
});
