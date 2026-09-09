import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const client = new Client({ name: 'enterprise-data-mcp-smoke-test', version: '0.1.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['src/index.js'],
  env: { ...process.env, MCP_TRANSPORT: 'stdio' }
});

function print(name, result) {
  process.stdout.write(`\n--- ${name} ---\n${JSON.stringify(result.structuredContent, null, 2)}\n`);
  if (result.isError) throw new Error(`${name} returned an MCP tool error`);
}

try {
  await client.connect(transport);
  const listed = await client.listTools();
  process.stdout.write(`Tools: ${listed.tools.map((tool) => tool.name).join(', ')}\n`);
  print('list_sources', await client.callTool({ name: 'list_sources', arguments: {} }));
  print('list_tables', await client.callTool({ name: 'list_tables', arguments: { source: 'ecommerce_db' } }));
  print('describe_table', await client.callTool({
    name: 'describe_table', arguments: { source: 'ecommerce_db', table: 'public.payments' }
  }));
  print('get_relationships', await client.callTool({
    name: 'get_relationships', arguments: { source: 'ecommerce_db' }
  }));
  print('execute_read_query', await client.callTool({
    name: 'execute_read_query',
    arguments: {
      source: 'ecommerce_db',
      sql: 'SELECT COUNT(*) AS total_orders FROM public.orders;'
    }
  }));
} finally {
  await client.close();
}
