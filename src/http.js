import http from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { settings } from './config.js';
import { buildServices } from './app.js';
import { createServer } from './server.js';

const MCP_ENDPOINT = '/mcp';
const HEALTH_ENDPOINT = '/health';

function toWebRequest(request) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  const init = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = Readable.toWeb(request);
    init.duplex = 'half';
  }
  return new Request(`http://mcp.internal${request.url}`, init);
}

async function sendWebResponse(response, nativeResponse) {
  nativeResponse.statusCode = response.status;
  response.headers.forEach((value, name) => nativeResponse.setHeader(name, value));
  if (!response.body) return nativeResponse.end();
  await pipeline(Readable.fromWeb(response.body), nativeResponse);
}

export function createHttpMcpServer(options = {}) {
  const host = options.host ?? settings.httpHost;
  const port = options.port ?? settings.httpPort;
  const services = options.services ?? buildServices();
  const handler = createMcpHandler(() => createServer(services), {
    legacy: 'stateless',
    responseMode: 'auto',
    onerror: (error) => services.logger.error('mcp_http_error', { message: error.message })
  });

  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://mcp.internal').pathname;
      if (request.method === 'GET' && pathname === HEALTH_ENDPOINT) {
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store'
        });
        return response.end(JSON.stringify({ status: 'ok' }));
      }
      if (pathname !== MCP_ENDPOINT) {
        response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
        return response.end(JSON.stringify({ error: 'not_found' }));
      }
      await sendWebResponse(await handler.fetch(toWebRequest(request)), response);
    } catch (error) {
      services.logger.error('http_request_error', { message: error.message });
      if (!response.headersSent) {
        response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ error: 'internal_error' }));
      } else response.destroy();
    }
  });

  async function close() {
    await handler.close();
    if (server.listening) {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
    await services.registry.close();
  }

  return { server, host, port, endpoint: MCP_ENDPOINT, close, services };
}

export async function startHttpMcpServer(options = {}) {
  const application = createHttpMcpServer(options);
  await new Promise((resolve, reject) => {
    application.server.once('error', reject);
    application.server.listen(application.port, application.host, resolve);
  });
  application.services.logger.info('mcp_server_started', {
    transport: 'streamable-http', host: application.host,
    port: application.port, endpoint: application.endpoint
  });
  return application;
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const application = await startHttpMcpServer();
  const shutdown = () => void application.close().finally(() => process.exit(0));
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
