import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { spawn, type ChildProcess } from 'node:child_process';
import { access } from 'node:fs/promises';
import { createServer, type RequestListener, type Server } from 'node:http';
import { fileURLToPath } from 'node:url';
import { landingPageHTML } from '../src/landing-page.js';

const packageDirectory = fileURLToPath(new URL('../', import.meta.url));
const staticKey = 'comp-test-static-key';

interface CliResult {
  exitCode: number | null;
  output: string;
}

function startCli(args: string[]): ChildProcess {
  return spawn('node', ['bin/mcp-server.js', ...args], {
    cwd: packageDirectory,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function stopCli(child: ChildProcess): Promise<void> {
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

function runUntilExitOrListening(args: string[]): Promise<CliResult> {
  const child = startCli(args);
  return new Promise((resolve, reject) => {
    let output = '';
    const finish = (exitCode: number | null) => {
      clearTimeout(timer);
      void stopCli(child).then(() => resolve({ exitCode, output }));
    };
    const timer = setTimeout(() => finish(null), 10000);
    const handleData = (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes('server started')) finish(null);
    };
    child.stdout?.on('data', handleData);
    child.stderr?.on('data', handleData);
    child.once('error', reject);
    child.once('exit', (code) => finish(code));
  });
}

function readResponse(params: { child: ChildProcess; id: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffered = '';
    const timer = setTimeout(() => reject(new Error('No stdio response')), 10000);
    const handleData = (chunk: Buffer) => {
      buffered += chunk.toString();
      const line = buffered
        .split('\n')
        .find((candidate) => candidate.includes(`"id":${params.id}`));
      if (!line) return;
      clearTimeout(timer);
      params.child.stdout?.off('data', handleData);
      resolve(line);
    };
    params.child.stdout?.on('data', handleData);
  });
}

function sendMessage(params: { child: ChildProcess; message: object }): void {
  params.child.stdin?.write(`${JSON.stringify(params.message)}\n`);
}

describe('start command transports', () => {
  const receivedApiKeys: (string | string[] | undefined)[] = [];
  let upstream: Server | undefined;
  let upstreamPort: number;

  beforeAll(async () => {
    await access(`${packageDirectory}bin/mcp-server.js`);
    const handleUpstreamRequest: RequestListener = (incoming, response) => {
      receivedApiKeys.push(incoming.headers['x-api-key']);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ id: 'org_start_test', name: 'Local dummy API' }));
    };
    upstream = createServer(handleUpstreamRequest);
    await new Promise<void>((resolve, reject) => {
      upstream?.once('error', reject);
      upstream?.listen(0, '127.0.0.1', resolve);
    });
    const address = upstream.address();
    if (!address || typeof address === 'string') throw new Error('Missing dummy API port');
    upstreamPort = address.port;
  });

  afterAll(async () => {
    if (!upstream) return;
    upstream.closeAllConnections();
    await new Promise<void>((resolve) => upstream?.close(() => resolve()));
  });

  test('accepts only the stdio transport', async () => {
    const result = await runUntilExitOrListening([
      'start',
      '--transport',
      'sse',
      '--apikey',
      staticKey,
    ]);
    expect(result.output).not.toContain('server started');
    expect(result.exitCode).not.toBeNull();
    expect(result.exitCode).not.toBe(0);
  });

  test('landing page lists only the streamable HTTP endpoint', () => {
    const html = landingPageHTML('http://127.0.0.1:2718');
    expect(html).toContain('http://127.0.0.1:2718/mcp');
    expect(html).not.toContain('/sse');
  });

  test('serves tools over stdio with the configured key', async () => {
    const child = startCli([
      'start',
      '--apikey',
      staticKey,
      '--server-url',
      `http://127.0.0.1:${upstreamPort}`,
    ]);
    try {
      sendMessage({
        child,
        message: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'start-transport-test', version: '1' },
          },
        },
      });
      expect(await readResponse({ child, id: 1 })).toContain('"result"');
      sendMessage({ child, message: { jsonrpc: '2.0', method: 'notifications/initialized' } });
      sendMessage({
        child,
        message: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: { name: 'get-organization', arguments: {} },
        },
      });
      expect(await readResponse({ child, id: 2 })).toContain('"result"');
      expect(receivedApiKeys).toEqual([staticKey]);
    } finally {
      await stopCli(child);
    }
  });
});
