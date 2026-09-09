import { AppError } from './errors.js';
import { validateReadQuery } from './sql-validator.js';

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export class QueryService {
  constructor(registry, { maxRows, queryTimeoutMs }, logger) {
    this.registry = registry;
    this.maxRows = maxRows;
    this.queryTimeoutMs = queryTimeoutMs;
    this.logger = logger;
  }

  async execute(sourceId, sql) {
    const source = this.registry.source(sourceId);
    const normalizedSql = validateReadQuery(sql, source.schemas);
    const pool = this.registry.pool(sourceId);
    const client = await pool.connect();
    const started = Date.now();
    try {
      await client.query('BEGIN TRANSACTION READ ONLY');
      await client.query(`SET LOCAL statement_timeout = '${this.queryTimeoutMs}ms'`);
      await client.query(`SET LOCAL lock_timeout = '${Math.min(this.queryTimeoutMs, 2000)}ms'`);
      await client.query(`SET LOCAL idle_in_transaction_session_timeout = '${this.queryTimeoutMs + 1000}ms'`);
      await client.query(`SET LOCAL search_path = ${source.schemas.map(quoteIdentifier).join(', ')}, pg_catalog`);

      // PostgreSQL resolves relations and columns here using the actual source metadata.
      await client.query(`EXPLAIN (FORMAT JSON) ${normalizedSql}`);
      const result = await client.query(
        `SELECT * FROM (${normalizedSql}) AS enterprise_data_mcp_result LIMIT ${this.maxRows + 1}`
      );
      await client.query('COMMIT');
      const truncated = result.rows.length > this.maxRows;
      const rows = truncated ? result.rows.slice(0, this.maxRows) : result.rows;
      this.logger.info('read_query_complete', {
        source: sourceId, durationMs: Date.now() - started, rowCount: rows.length, truncated
      });
      return {
        columns: result.fields.map((field) => ({ name: field.name, dataTypeId: field.dataTypeID })),
        rows,
        rowCount: rows.length,
        truncated,
        maxRows: this.maxRows
      };
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* connection cleanup continues */ }
      this.logger.warn('read_query_failed', {
        source: sourceId, durationMs: Date.now() - started, databaseCode: error.code, message: error.message
      });
      if (error.code === '57014') throw new AppError('QUERY_TIMEOUT', `Query exceeded ${this.queryTimeoutMs}ms`);
      if (error.code === '42P01' || error.code === '42703' || error.code === '3F000') {
        throw new AppError('INVALID_REFERENCE', 'Query references an unknown or inaccessible table, schema, or column', {
          databaseCode: error.code, databaseMessage: error.message
        });
      }
      if (error.code === '25006') throw new AppError('READ_ONLY_VIOLATION', 'PostgreSQL rejected a write in the read-only transaction');
      if (error instanceof AppError) throw error;
      throw new AppError('QUERY_FAILED', 'PostgreSQL could not execute the query', {
        databaseCode: error.code, databaseMessage: error.message
      });
    } finally {
      client.release();
    }
  }
}
