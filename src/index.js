import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { buildApplication } from './app.js';

let application;
const transport = (process.env.MCP_TRANSPORT ?? 'stdio').toLowerCase();

function createConnectionServer() {
  application = buildApplication();
  return application.server;
}

if (transport === 'stdio') {
  void serveStdio(createConnectionServer);
  process.stderr.write(`${JSON.stringify({ severity: 'info', event: 'mcp_server_started', transport: 'stdio' })}\n`);
} else if (transport === 'http') {
  const { startHttpMcpServer } = await import('./http.js');
  application = await startHttpMcpServer();
} else {
  throw new Error(`MCP_TRANSPORT must be 'stdio' or 'http', received '${transport}'`);
}

async function shutdown() {
  if (!application) return;
  if (transport === 'http') await application.close();
  else await application.registry.close();
}
process.once('SIGINT', () => void shutdown().finally(() => process.exit(0)));
process.once('SIGTERM', () => void shutdown().finally(() => process.exit(0)));
