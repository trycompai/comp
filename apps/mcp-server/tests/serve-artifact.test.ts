import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { spawn, type ChildProcess } from 'node:child_process';
import { access } from 'node:fs/promises';
import { createServer, request as httpRequest, type RequestListener, type Server } from 'node:http';
import { fileURLToPath } from 'node:url';

const packageDirectory = fileURLToPath(new URL('../', import.meta.url));
const staticKey = 'comp-test-static-key';
const callerKey = 'comp-test-caller-key';
const initialization = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'artifact-security-test', version: '1' },
  },
};

interface HttpResult {
  status: number | undefined;
  body: string;
}

function request(params: {
  port: number;
  method?: 'POST' | 'GET';
  headers?: Record<string, string>;
  body?: object;
}): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const method = params.method ?? 'POST';
    const body = method === 'POST' ? JSON.stringify(params.body ?? initialization) : undefined;
    // node:http preserves an explicit Host header, unlike fetch implementations.
    const outgoing = httpRequest({
      hostname: '127.0.0.1',
      port: params.port,
      path: '/mcp',
      method,
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...(body ? { 'content-length': Buffer.byteLength(body) } : {}),
        ...params.headers,
      },
    }, (response) => {
      let responseBody = '';
      response.on('data', (chunk: Buffer) => { responseBody += chunk.toString(); });
      response.on('end', () => resolve({ status: response.statusCode, body: responseBody }));
    });
    outgoing.on('error', reject);
    outgoing.setTimeout(5000, () => outgoing.destroy(new Error('HTTP request timed out')));
    outgoing.end(body);
  });
}

async function startServer(params: {
  host: string;
  upstreamPort: number;
  processes: ChildProcess[];
}): Promise<number> {
  const child = spawn('node', [
    'bin/mcp-server.js', 'serve', '--host', params.host, '--port', '0',
    '--apikey', staticKey, '--server-url', `http://127.0.0.1:${params.upstreamPort}`,
    '--log-level', 'info',
  ], { cwd: packageDirectory, stdio: ['ignore', 'pipe', 'pipe'] });
  params.processes.push(child);

  return new Promise((resolve, reject) => {
    let logs = '';
    const timer = setTimeout(() => reject(new Error(`MCP server did not start: ${logs}`)), 10000);
    const handleData = (chunk: Buffer) => {
      logs += chunk.toString();
      const match = /host=[^\s]+:(\d+)/.exec(logs);
      if (!match?.[1]) return;
      clearTimeout(timer);
      resolve(Number(match[1]));
    };
    child.stdout?.on('data', handleData);
    child.stderr?.on('data', handleData);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`MCP server exited (${code}): ${logs}`));
    });
  });
}

function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => child.kill('SIGKILL'), 1000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

describe('built HTTP MCP artifact security', () => {
  const processes: ChildProcess[] = [];
  const receivedApiKeys: (string | string[] | undefined)[] = [];
  let upstream: Server | undefined;
  let networkPort: number;
  let loopbackPort: number;

  beforeAll(async () => {
    // Build first: this intentionally tests the distributed executable, not helpers.
    await access(`${packageDirectory}bin/mcp-server.js`);
    const handleUpstreamRequest: RequestListener = (incoming, response) => {
      receivedApiKeys.push(incoming.headers['x-api-key']);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ id: 'org_security_test', name: 'Local dummy API' }));
    };
    upstream = createServer(handleUpstreamRequest);
    await new Promise<void>((resolve, reject) => {
      upstream?.once('error', reject);
      upstream?.listen(0, '127.0.0.1', resolve);
    });
    const address = upstream.address();
    if (!address || typeof address === 'string') throw new Error('Missing dummy API port');
    networkPort = await startServer({ host: '0.0.0.0', upstreamPort: address.port, processes });
    loopbackPort = await startServer({ host: '127.0.0.1', upstreamPort: address.port, processes });
  });

  afterAll(async () => {
    await Promise.all(processes.map(stopServer));
    if (!upstream) return;
    upstream.closeAllConnections();
    await new Promise<void>((resolve) => upstream?.close(() => resolve()));
  });

  test('rejects network requests without a caller key despite a configured static key', async () => {
    expect((await request({ port: networkPort })).status).toBe(401);
    expect((await request({ port: networkPort, headers: { apikey: '   ' } })).status).toBe(401);
    expect(receivedApiKeys).toHaveLength(0);
  });

  test('rejects hostile browser Origins on both bindings', async () => {
    const headers = { apikey: callerKey, origin: 'https://attacker.example' };
    expect((await request({ port: networkPort, headers })).status).toBe(403);
    expect((await request({ port: loopbackPort, headers })).status).toBe(403);
    expect(receivedApiKeys).toHaveLength(0);
  });

  test('rejects a DNS rebinding Host on the loopback binding', async () => {
    const result = await request({ port: loopbackPort, headers: { host: 'attacker.example' } });
    expect(result.status).toBe(403);
    expect(receivedApiKeys).toHaveLength(0);
  });

  test('allows credentialed network initialization and local static-key clients', async () => {
    const network = await request({ port: networkPort, headers: { apikey: callerKey } });
    const local = await request({ port: loopbackPort });
    const browser = await request({ port: loopbackPort, headers: { origin: 'http://localhost:2718' } });
    for (const result of [network, local, browser]) {
      expect(result.status).toBe(200);
      expect(result.body).toContain('"result"');
    }
  });

  test('does not expose an unauthenticated GET MCP handler', async () => {
    expect((await request({ port: networkPort, method: 'GET' })).status).toBe(404);
  });

  test('forwards caller credentials on network bindings and static credentials only locally', async () => {
    const body = {
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: 'get-organization', arguments: {} },
    };
    const network = await request({ port: networkPort, headers: { apikey: callerKey }, body });
    expect(network.status).toBe(200);
    expect(network.body).toContain('"result"');
    expect(receivedApiKeys).toEqual([callerKey]);
    const local = await request({ port: loopbackPort, body });
    expect(local.status).toBe(200);
    expect(receivedApiKeys).toEqual([callerKey, staticKey]);
  });
});
