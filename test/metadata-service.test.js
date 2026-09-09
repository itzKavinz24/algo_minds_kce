import assert from 'node:assert/strict';
import test from 'node:test';
import { MetadataService } from '../src/metadata-service.js';

test('describeTable exposes comments and bounded observed domains only for approved columns', async () => {
  const observedQueries = [];
  const client = {
    async query(query) {
      if (typeof query === 'string') return { rows: [], rowCount: 0 };
      observedQueries.push(query.text);
      return { rows: [{ value: 'captured' }], rowCount: 1 };
    },
    release() {}
  };
  const pool = {
    async connect() { return client; },
    async query(query) {
      if (query.text.includes('FROM information_schema.tables')) {
        return { rows: [{ schema: 'public', name: 'payments' }], rowCount: 1 };
      }
      if (query.text.includes('FROM information_schema.columns')) {
        return { rows: [
          { ordinal_position: 1, name: 'id', data_type: 'bigint', nullable: false, description: null,
            estimated_rows: '353', enum_values: null, check_constraints: [] },
          { ordinal_position: 2, name: 'status', data_type: 'character varying', nullable: false,
            description: 'Payment state. captured means successfully captured.', estimated_rows: '353',
            enum_values: null, check_constraints: ["CHECK (status::text = 'captured'::text)"] },
          { ordinal_position: 3, name: 'email', data_type: 'character varying', nullable: true,
            description: null, estimated_rows: '353', enum_values: null, check_constraints: [] },
          { ordinal_position: 4, name: 'kind', data_type: 'USER-DEFINED', nullable: false,
            description: null, estimated_rows: '353', enum_values: ['card', 'cash'], check_constraints: [] }
        ], rowCount: 4 };
      }
      if (query.text.includes("con.contype='p'")) return { rows: [{ column: 'id' }], rowCount: 1 };
      if (query.text.includes("con.contype='f'")) return { rows: [], rowCount: 0 };
      throw new Error('Unexpected query');
    }
  };
  const registry = {
    source() { return { id: 'sample', schemas: ['public'], domainColumns: ['public.payments.status'] }; },
    pool() { return pool; },
    logger: { warn() {} }
  };
  const service = new MetadataService(registry, {
    metadataMaxDistinctValues: 20, metadataScanRowLimit: 50000, metadataTimeoutMs: 1000
  });

  const table = await service.describeTable('sample', 'public.payments');
  const status = table.columns.find((column) => column.name === 'status');
  assert.equal(status.semanticMeaning, status.description);
  assert.deepEqual(status.valueDomain.values, ['captured']);
  assert.equal(status.valueDomain.completeForCurrentData, true);
  assert.equal(table.columns.find((column) => column.name === 'email').valueDomain, undefined);
  assert.deepEqual(table.columns.find((column) => column.name === 'kind').valueDomain, {
    source: 'postgresql_enum', values: ['card', 'cash'], complete: true
  });
  assert.equal(observedQueries.length, 1);
  assert.equal(status.column, 'status');
  assert.equal(status.type, 'character varying');
  assert.equal(status.semantic_type, 'categorical');
  assert.deepEqual(status.values, ['captured']);
  const kind = table.columns.find((column) => column.name === 'kind');
  assert.equal(kind.column, 'kind');
  assert.equal(kind.semantic_type, 'enum');
  assert.deepEqual(kind.values, ['card', 'cash']);
  const email = table.columns.find((column) => column.name === 'email');
  assert.equal(email.semantic_type, null);
  assert.equal(email.values, null);
});

test('describeTable extracts declared enum values from check constraints', async () => {
  const pool = {
    async connect() { throw new Error('must not connect for declared check constraints'); },
    async query(query) {
      if (query.text.includes('FROM information_schema.tables')) {
        return { rows: [{ schema: 'public', name: 'employees' }], rowCount: 1 };
      }
      if (query.text.includes('FROM information_schema.columns')) {
        return { rows: [
          {
            ordinal_position: 1, name: 'employment_status', data_type: 'text', nullable: false,
            description: 'Current workforce status', estimated_rows: '240', enum_values: null,
            check_constraints: ["CHECK (employment_status = ANY (ARRAY['Active'::text, 'Resigned'::text, 'On Leave'::text]))"]
          }
        ], rowCount: 1 };
      }
      if (query.text.includes("con.contype='p'")) return { rows: [], rowCount: 0 };
      if (query.text.includes("con.contype='f'")) return { rows: [], rowCount: 0 };
      throw new Error('Unexpected query');
    }
  };
  const registry = {
    source() { return { id: 'sample', schemas: ['public'], domainColumns: [] }; },
    pool() { return pool; }
  };
  const service = new MetadataService(registry);
  const table = await service.describeTable('sample', 'public.employees');
  const empStatus = table.columns.find((c) => c.name === 'employment_status');
  assert.equal(empStatus.column, 'employment_status');
  assert.equal(empStatus.type, 'text');
  assert.equal(empStatus.semantic_type, 'enum');
  assert.deepEqual(empStatus.values, ['Active', 'Resigned', 'On Leave']);
  assert.equal(empStatus.valueDomain.source, 'check_constraint');
  assert.deepEqual(empStatus.valueDomain.values, ['Active', 'Resigned', 'On Leave']);
});

test('describeTable skips observed domain scans above the configured table-size limit', async () => {
  let connected = false;
  const pool = {
    async connect() { connected = true; throw new Error('must not connect'); },
    async query(query) {
      if (query.text.includes('FROM information_schema.tables')) {
        return { rows: [{ schema: 'public', name: 'events' }], rowCount: 1 };
      }
      if (query.text.includes('FROM information_schema.columns')) {
        return { rows: [{ name: 'status', description: null, estimated_rows: '50001', enum_values: null,
          check_constraints: [] }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
  };
  const registry = {
    source() { return { id: 'sample', schemas: ['public'], domainColumns: ['public.events.status'] }; },
    pool() { return pool; }
  };
  const table = await new MetadataService(registry, { metadataScanRowLimit: 50000 })
    .describeTable('sample', 'public.events');
  assert.equal(connected, false);
  assert.equal(table.columns[0].valueDomain, undefined);
  assert.equal(table.columns[0].values, null);
  assert.equal(table.columns[0].semantic_type, null);
});
