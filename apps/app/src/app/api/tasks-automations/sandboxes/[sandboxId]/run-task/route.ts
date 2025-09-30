import { Sandbox } from '@vercel/sandbox';
import { NextRequest, NextResponse } from 'next/server';

const RUNNER_PATH = 'scripts/run-task.js';
const EVENT_PATH = 'events/event.json';

function getRunnerContent() {
  return `
const taskPath = process.argv[2];
const eventPath = process.argv[3];
const fs = require('fs');
const path = require('path');

// Mock getSecret function to match Lambda environment
async function getSecret(orgId, key) {
  // For sandbox testing, just return a mock value
  // In real Lambda, this would fetch from Secrets Manager
  console.error('[getSecret] Mock implementation - returning null for', key);
  return null;
}

// Make getSecret and fetch available as globals like in Lambda
global.getSecret = getSecret;
global.fetch = global.fetch || require('node-fetch');

async function run() {
  try {
    // Resolve the path relative to the sandbox root
    const resolvedPath = path.resolve(process.cwd(), taskPath);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(\`Task file not found: \${resolvedPath}\`);
    }
    
    const taskModule = require(resolvedPath);
    const taskFunction = taskModule; // Should be the function directly
    
    if (typeof taskFunction !== 'function') {
      throw new Error('Task module must export a function via module.exports = async (event) => { ... }');
    }

    const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const result = await taskFunction(event);
    console.log(JSON.stringify({ ok: true, result }));
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: e?.message || 'Unknown error' }));
  }
}

run();
`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sandboxId: string }> },
) {
  const { sandboxId } = await params;
  const body = await request.json();
  const taskPath: string = body?.path;
  const event: unknown = body?.event ?? {};
  if (!taskPath) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  const sandbox = await Sandbox.get({ sandboxId });

  // Ensure runner and event file exist (idempotent)
  await sandbox.writeFiles([
    { path: RUNNER_PATH, content: Buffer.from(getRunnerContent(), 'utf8') },
    { path: EVENT_PATH, content: Buffer.from(JSON.stringify(event ?? {}), 'utf8') },
  ]);

  const cmd = await sandbox.runCommand({
    detached: true,
    cmd: 'node',
    args: [RUNNER_PATH, taskPath, EVENT_PATH],
  });

  return NextResponse.json({
    sandboxId,
    cmdId: cmd.cmdId,
    command: 'node',
    args: [RUNNER_PATH, taskPath, EVENT_PATH],
  });
}
