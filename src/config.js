import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { AppError } from './errors.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// dotenv 17 may print an injection banner; stdout must remain pure MCP JSON-RPC.
// Resolve from this module so MCP hosts may launch the server from any directory.
dotenv.config({ path: path.join(root, '.env'), quiet: true });

const configPath = process.env.MCP_SOURCES_CONFIG
  ? path.resolve(process.env.MCP_SOURCES_CONFIG)
  : path.join(root, 'config', 'sources.json');

function integerSetting(name, fallback, min, max) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function loadSources() {
  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!Array.isArray(parsed.sources) || parsed.sources.length === 0) {
    throw new Error('Source config must contain a non-empty sources array');
  }
  const ids = new Set();
  return parsed.sources.map((source) => {
    if (!/^[a-z][a-z0-9_-]*$/.test(source.id) || ids.has(source.id)) {
      throw new Error(`Invalid or duplicate source id: ${source.id}`);
    }
    ids.add(source.id);
    if (source.engine !== 'postgresql') throw new Error(`Unsupported engine for ${source.id}`);
    if (!/^[A-Z][A-Z0-9_]*$/.test(source.envPrefix)) {
      throw new Error(`Invalid envPrefix for ${source.id}`);
    }
    const schemas = source.schemas ?? ['public'];
    if (!schemas.every((s) => /^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(s))) {
      throw new Error(`Invalid schema allowlist for ${source.id}`);
    }
    const domainColumns = source.domainColumns ?? [];
    if (!Array.isArray(domainColumns) ||
        !domainColumns.every((name) => /^[a-zA-Z_][a-zA-Z0-9_$]*\.[a-zA-Z_][a-zA-Z0-9_$]*\.[a-zA-Z_][a-zA-Z0-9_$]*$/.test(name))) {
      throw new Error(`Invalid domainColumns allowlist for ${source.id}`);
    }
    if (!domainColumns.every((name) => schemas.includes(name.split('.')[0]))) {
      throw new Error(`domainColumns must use an allowed schema for ${source.id}`);
    }
    return Object.freeze({
      ...source,
      schemas: Object.freeze(schemas),
      domainColumns: Object.freeze(domainColumns)
    });
  });
}

export const settings = Object.freeze({
  sources: Object.freeze(loadSources()),
  maxRows: integerSetting('MCP_QUERY_MAX_ROWS', 500, 1, 5000),
  queryTimeoutMs: integerSetting('MCP_QUERY_TIMEOUT_MS', 5000, 100, 60000),
  metadataMaxDistinctValues: integerSetting('MCP_METADATA_MAX_DISTINCT_VALUES', 20, 1, 100),
  metadataScanRowLimit: integerSetting('MCP_METADATA_SCAN_ROW_LIMIT', 50000, 1, 1000000),
  metadataTimeoutMs: integerSetting('MCP_METADATA_TIMEOUT_MS', 1000, 100, 10000),
  logLevel: process.env.MCP_LOG_LEVEL ?? 'info',
  httpHost: process.env.MCP_HOST ?? '0.0.0.0',
  httpPort: integerSetting('MCP_PORT', 3000, 1, 65535)
});

function requiredCredential(environment, name, sourceId) {
  const value = environment[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError(
      'SOURCE_CONFIGURATION_ERROR',
      `Data source '${sourceId}' requires the server-side environment variable ${name}`
    );
  }
  return value;
}

export function connectionConfig(source, environment = process.env) {
  const p = source.envPrefix;
  const connectionString = environment[`${p}_DATABASE_URL`];
  const sslEnabled = (environment[`${p}_SSL`] ?? 'false').toLowerCase() === 'true';
  const ssl = sslEnabled ? { rejectUnauthorized: true } : false;
  if (connectionString) {
    if (typeof connectionString !== 'string') {
      throw new AppError('SOURCE_CONFIGURATION_ERROR', `${p}_DATABASE_URL must be a string`);
    }
    let parsed;
    try { parsed = new URL(connectionString); }
    catch { throw new AppError('SOURCE_CONFIGURATION_ERROR', `${p}_DATABASE_URL must be a valid PostgreSQL URL`); }
    if (!parsed.password) {
      throw new AppError('SOURCE_CONFIGURATION_ERROR', `${p}_DATABASE_URL must include a password for SCRAM authentication`);
    }
    return { connectionString, ssl };
  }
  const port = Number(environment[`${p}_PORT`] ?? 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new AppError('SOURCE_CONFIGURATION_ERROR', `${p}_PORT must be an integer between 1 and 65535`);
  }
  const password = requiredCredential(environment, `${p}_PASSWORD`, source.id);
  return {
    host: environment[`${p}_HOST`] ?? 'localhost',
    port,
    database: environment[`${p}_NAME`] ?? source.id,
    user: environment[`${p}_USER`] ?? 'analytics_readonly',
    password: String(password),
    ssl
  };
}
