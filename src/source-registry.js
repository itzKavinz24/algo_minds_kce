import pg from 'pg';
import { AppError } from './errors.js';
import { connectionConfig } from './config.js';

export class SourceRegistry {
  #sources;
  #pools = new Map();

  constructor(sources, logger) {
    this.#sources = new Map(sources.map((source) => [source.id, source]));
    this.logger = logger;
  }

  list() {
    return [...this.#sources.values()].map(({ id, displayName, engine, schemas }) => ({
      id, displayName, engine, schemas
    }));
  }

  source(id) {
    const source = this.#sources.get(id);
    if (!source) throw new AppError('UNKNOWN_SOURCE', `Unknown data source: ${id}`);
    return source;
  }

  pool(id) {
    const source = this.source(id);
    if (!this.#pools.has(id)) {
      const pool = new pg.Pool({
        ...connectionConfig(source),
        application_name: 'enterprise-data-mcp',
        max: 5,
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 30000
      });
      pool.on('error', (error) => this.logger.error('postgres_pool_error', { source: id, message: error.message }));
      this.#pools.set(id, pool);
    }
    return this.#pools.get(id);
  }

  async close() {
    await Promise.all([...this.#pools.values()].map((pool) => pool.end()));
  }
}
