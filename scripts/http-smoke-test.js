import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const port = Number(process.env.MCP_PORT ?? 3000);
const url = process.env.MCP_HTTP_URL ?? `http://127.0.0.1:${port}/mcp`;
const client = new Client({ name: 'enterprise-data-mcp-http-smoke-test', version: '0.1.0' });

function check(name, result) {
  if (result.isError) throw new Error(`${name} failed: ${JSON.stringify(result.structuredContent)}`);
  process.stdout.write(`${name} passed\n`);
}

try {
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  check('list_sources', await client.callTool({ name: 'list_sources', arguments: {} }));
  check('list_tables', await client.callTool({ name: 'list_tables', arguments: { source: 'ecommerce_db' } }));
  check('describe_table', await client.callTool({
    name: 'describe_table', arguments: { source: 'ecommerce_db', table: 'public.orders' }
  }));
  check('get_relationships', await client.callTool({
    name: 'get_relationships', arguments: { source: 'ecommerce_db' }
  }));
  check('execute_read_query', await client.callTool({
    name: 'execute_read_query',
    arguments: { source: 'ecommerce_db', sql: 'SELECT COUNT(*) AS total_orders FROM public.orders;' }
  }));
} finally {
  await client.close();
}
