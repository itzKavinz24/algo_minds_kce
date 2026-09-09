import test from 'node:test';
import assert from 'node:assert/strict';
import { connectionConfig } from '../src/config.js';

const source = { id: 'sample_db', envPrefix: 'SAMPLE_DB' };

test('passes a configured password to pg as a string', () => {
  const config = connectionConfig(source, {
    SAMPLE_DB_HOST: 'localhost',
    SAMPLE_DB_PORT: '5432',
    SAMPLE_DB_NAME: 'sample_db',
    SAMPLE_DB_USER: 'analytics_readonly',
    SAMPLE_DB_PASSWORD: 'local-test-placeholder',
    SAMPLE_DB_SSL: 'false'
  });
  assert.equal(config.password, 'local-test-placeholder');
  assert.equal(typeof config.password, 'string');
});

test('rejects an absent or empty SCRAM password before creating a pool', () => {
  assert.throws(() => connectionConfig(source, {}), /SAMPLE_DB_PASSWORD/);
  assert.throws(() => connectionConfig(source, { SAMPLE_DB_PASSWORD: '' }), /SAMPLE_DB_PASSWORD/);
});

test('uses the registered prefix for future sources', () => {
  const config = connectionConfig(
    { id: 'hrms_db', envPrefix: 'HRMS_DB' },
    { HRMS_DB_PASSWORD: 'local-test-placeholder' }
  );
  assert.equal(config.database, 'hrms_db');
  assert.equal(config.password, 'local-test-placeholder');
});
