import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { settings, connectionConfig } from '../src/config.js';

const base = connectionConfig(settings.sources.find((source) => source.id === 'ecommerce_db'));
const environment = { ...process.env, MCP_TRANSPORT: 'stdio' };
for (const source of settings.sources.filter((item) => item.id !== 'ecommerce_db')) {
  const prefix = source.envPrefix;
  environment[`${prefix}_HOST`] ??= base.host;
  environment[`${prefix}_PORT`] ??= String(base.port);
  environment[`${prefix}_NAME`] ??= source.id;
  environment[`${prefix}_USER`] ??= base.user;
  environment[`${prefix}_PASSWORD`] ??= String(base.password);
  environment[`${prefix}_SSL`] ??= 'false';
}
const client = new Client({ name: 'enterprise-multi-source-smoke', version: '0.1.0' });
const transport = new StdioClientTransport({ command: process.execPath, args: ['src/index.js'], env: environment });
const sampleTables = { ecommerce_db: 'payments', hrms_db: 'employees', crm_db: 'opportunities', erp_db: 'invoices' };
try {
  await client.connect(transport);
  const sourcesResult = await client.callTool({ name: 'list_sources', arguments: {} });
  if (sourcesResult.isError) throw new Error('list_sources failed');
  const report = {};
  for (const source of sourcesResult.structuredContent.sources) {
    const list = await client.callTool({ name: 'list_tables', arguments: { source: source.id } });
    const describe = await client.callTool({ name: 'describe_table', arguments: { source: source.id, table: `public.${sampleTables[source.id]}` } });
    const relationships = await client.callTool({ name: 'get_relationships', arguments: { source: source.id } });
    const read = await client.callTool({ name: 'execute_read_query', arguments: { source: source.id, sql: `SELECT count(*) AS rows FROM public.${sampleTables[source.id]}` } });
    if ([list, describe, relationships, read].some((result) => result.isError)) throw new Error(`MCP tool failure for ${source.id}`);
    report[source.id] = {
      list_tables: 'ok', describe_table: 'ok', get_relationships: 'ok', execute_read_query: 'ok',
      tables: list.structuredContent.tables.length, relationships: relationships.structuredContent.relationships.length,
      sampleRows: read.structuredContent.result.rows[0].rows
    };
  }
  process.stdout.write(`${JSON.stringify({ list_sources: 'ok', sources: report }, null, 2)}\n`);
} finally { await client.close(); }
