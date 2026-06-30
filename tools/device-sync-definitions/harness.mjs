// Shared test harness for the device_sync definition tests.
// Runs each `code` string exactly as the DSL interpreter does
// (new AsyncFunction('ctx','scope', code)) and validates output against the
// SyncDeviceSchema contract. Imported by intune.test.mjs / jumpcloud.test.mjs.

import assert from 'node:assert';

let failures = 0;

// Async-aware: awaits the callback so async assertions (incl. expectThrows) are
// reliably caught and counted before report() runs.
export async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures++;
    console.error(`  ✗ ${name}\n      ${e.message}`);
  }
}

export function report() {
  console.log('');
  if (failures > 0) {
    console.error(`${failures} test(s) failed`);
    process.exit(1);
  }
  console.log('All device_sync definition tests passed.');
}

export function resp(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

// Mirrors SyncDeviceSchema (packages/integration-platform/src/dsl/types.ts):
// the interpreter drops items that fail this, so the harness does too.
const PLATFORMS = ['macos', 'windows', 'linux'];
const STATUSES = ['active', 'inactive'];
export function validate(devices) {
  assert(Array.isArray(devices), 'scope.devices must be an array');
  return devices.filter(
    (d) =>
      d &&
      typeof d.name === 'string' &&
      d.name.length > 0 &&
      PLATFORMS.includes(d.platform) &&
      typeof d.userEmail === 'string' &&
      d.userEmail.length > 0 &&
      STATUSES.includes(d.status),
  );
}

export async function runCode(code, ctx) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction('ctx', 'scope', code);
  const scope = {};
  await fn(ctx, scope);
  return scope.devices;
}

export function makeCtx({ accessToken, credentials, fetchImpl }) {
  globalThis.fetch = fetchImpl;
  return {
    accessToken,
    credentials,
    log: () => {},
    warn: () => {},
    error: () => {},
  };
}

// Rejects (so the enclosing test() counts a failure) unless `promise` throws
// with a message matching `match`.
export async function expectThrows(promise, match) {
  try {
    await promise;
  } catch (e) {
    assert(match.test(e.message), `expected error matching ${match}, got: ${e.message}`);
    return;
  }
  throw new Error('expected the code to throw, but it resolved');
}
