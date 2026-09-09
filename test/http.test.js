import test from 'node:test';
import assert from 'node:assert/strict';
import { createHttpMcpServer } from '../src/http.js';

test('health endpoint reports status without connection details', async () => {
  const services = {
    logger: { info() {}, warn() {}, error() {} },
    registry: { list: () => [], close: async () => {} },
    metadata: {}, queries: {}
  };
  const application = createHttpMcpServer({ host: '127.0.0.1', port: 0, services });
  await new Promise((resolve, reject) => {
    application.server.once('error', reject);
    application.server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const { port } = application.server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  } finally {
    await application.close();
  }
});
