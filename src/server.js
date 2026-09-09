import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { publicError } from './errors.js';

const sourceInput = z.object({ source: z.string().min(1) });

function response(data) {
  const serializable = JSON.parse(JSON.stringify(data, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  return {
    content: [{ type: 'text', text: JSON.stringify(serializable, null, 2) }],
    structuredContent: serializable
  };
}

function safeHandler(name, logger, handler) {
  return async (input) => {
    try {
      return response(await handler(input));
    } catch (error) {
      const details = publicError(error);
      logger.warn('tool_error', { tool: name, code: details.code, message: error.message });
      return { ...response({ error: details }), isError: true };
    }
  };
}

export function createServer({ registry, metadata, queries, logger }) {
  const server = new McpServer(
    { name: 'enterprise-data-mcp', version: '0.1.0' },
    { instructions: 'Discover sources and metadata before querying. Queries are read-only, time-limited, and row-limited.' }
  );

  server.registerTool('list_sources', {
    title: 'List enterprise data sources',
    description: 'Lists configured data-source identifiers without exposing connection details or credentials.',
    inputSchema: z.object({})
  }, safeHandler('list_sources', logger, async () => ({ sources: registry.list() })));

  server.registerTool('list_tables', {
    title: 'List source tables',
    description: 'Discovers accessible base tables from PostgreSQL metadata.', inputSchema: sourceInput
  }, safeHandler('list_tables', logger, async ({ source }) => ({ source, tables: await metadata.listTables(source) })));

  server.registerTool('describe_table', {
    title: 'Describe a source table',
    description: 'Returns dynamically discovered columns, PostgreSQL types, nullability, defaults, comments, constraints, primary/foreign keys, and bounded value domains for explicitly approved categorical columns.',
    inputSchema: z.object({ source: z.string().min(1), table: z.string().min(1) })
  }, safeHandler('describe_table', logger, async ({ source, table }) => ({
    source, table: await metadata.describeTable(source, table)
  })));

  server.registerTool('get_relationships', {
    title: 'Get source relationships',
    description: 'Discovers foreign-key relationships, including composite keys and update/delete rules.', inputSchema: sourceInput
  }, safeHandler('get_relationships', logger, async ({ source }) => ({
    source, relationships: await metadata.getRelationships(source)
  })));

  server.registerTool('execute_read_query', {
    title: 'Execute a read-only SQL query',
    description: 'Executes one parsed SELECT/VALUES query. PostgreSQL validates table and column references inside a read-only, timed transaction; output is row-limited.',
    inputSchema: z.object({ source: z.string().min(1), sql: z.string().min(1).max(100000) }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, safeHandler('execute_read_query', logger, async ({ source, sql }) => ({
    source, result: await queries.execute(source, sql)
  })));

  return server;
}
