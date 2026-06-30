// Offline mock harness for the Intune + JumpCloud device_sync code steps.
// Runs each `code` string exactly as the DSL interpreter does
// (new AsyncFunction('ctx','scope', code)) against canned API responses, then
// validates the output against the SyncDeviceSchema contract (invalid dropped).
//
// Run: node tools/device-sync-definitions/test.mjs
//
// This proves correctness without the live internal API or a real connection.

import assert from 'node:assert';
import { code as intuneCode } from './intune.mjs';
import { code as jumpcloudCode } from './jumpcloud.mjs';

let failures = 0;
// Async-aware: awaits the callback so async assertions (incl. expectThrows) are
// reliably caught and counted before the final summary runs.
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures++;
    console.error(`  ✗ ${name}\n      ${e.message}`);
  }
}

// ---- helpers -------------------------------------------------------------
function resp(status, body) {
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
function validate(devices) {
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

async function runCode(code, ctx) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction('ctx', 'scope', code);
  const scope = {};
  await fn(ctx, scope);
  return scope.devices;
}

function makeCtx({ accessToken, credentials, fetchImpl }) {
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
async function expectThrows(promise, match) {
  try {
    await promise;
  } catch (e) {
    assert(match.test(e.message), `expected error matching ${match}, got: ${e.message}`);
    return;
  }
  throw new Error('expected the code to throw, but it resolved');
}

// =========================================================================
// Intune
// =========================================================================
console.log('Intune device_sync:');

await (async () => {
  const page1 = {
    value: [
      { id: 'i1', deviceName: 'WIN-1', operatingSystem: 'Windows', osVersion: '10.0', model: 'Surface', emailAddress: 'Win@CO.com', serialNumber: 'W1' },
      { id: 'i2', deviceName: 'MAC-1', operatingSystem: 'macOS', emailAddress: '', userPrincipalName: 'Mac@CO.com', serialNumber: 'M1' },
      { id: 'i3', deviceName: 'IPHONE', operatingSystem: 'iOS', emailAddress: 'phone@co.com' },
      { id: 'i4', deviceName: 'KIOSK', operatingSystem: 'Windows', emailAddress: '', userPrincipalName: '' },
    ],
    '@odata.nextLink': 'PAGE2',
  };
  const page2 = {
    value: [
      { id: 'i5', deviceName: 'LNX-1', operatingSystem: 'Linux', emailAddress: 'lnx@co.com' },
    ],
  };
  const fetchImpl = async (url) => {
    if (url === 'PAGE2') return resp(200, page2);
    if (String(url).includes('managedDevices')) return resp(200, page1);
    throw new Error('unexpected url ' + url);
  };
  const ctx = makeCtx({ accessToken: 'tok', fetchImpl });
  const raw = await runCode(intuneCode, ctx);
  const devices = validate(raw);

  await test('paginates and maps Windows/macOS/Linux, drops iOS + no-email', () => {
    assert.equal(devices.length, 3);
    const byId = Object.fromEntries(devices.map((d) => [d.externalId, d]));
    assert.equal(byId.i1.platform, 'windows');
    assert.equal(byId.i2.platform, 'macos');
    assert.equal(byId.i5.platform, 'linux');
    assert(!devices.some((d) => d.externalId === 'i3'), 'iOS must be dropped');
    assert(!devices.some((d) => d.externalId === 'i4'), 'no-email must be dropped');
  });

  await test('lowercases owner email and falls back to userPrincipalName', () => {
    const byId = Object.fromEntries(devices.map((d) => [d.externalId, d]));
    assert.equal(byId.i1.userEmail, 'win@co.com');
    assert.equal(byId.i2.userEmail, 'mac@co.com'); // UPN fallback
  });

  await test('carries serial, externalId, osVersion, hardwareModel', () => {
    const byId = Object.fromEntries(devices.map((d) => [d.externalId, d]));
    assert.equal(byId.i1.serialNumber, 'W1');
    assert.equal(byId.i1.osVersion, '10.0');
    assert.equal(byId.i1.hardwareModel, 'Surface');
  });
})();

await (async () => {
  const ctx = makeCtx({ accessToken: 'tok', fetchImpl: async () => resp(401, 'Unauthorized') });
  await test('throws a clear error on 401', () =>
    expectThrows(runCode(intuneCode, ctx), /authorization failed/i));
})();

await (async () => {
  const ctx = makeCtx({ accessToken: 'tok', fetchImpl: async () => resp(200, { value: [] }) });
  const raw = await runCode(intuneCode, ctx);
  await test('produces an empty list when no devices', () => {
    assert.deepEqual(validate(raw), []);
  });
})();

await (async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    if (calls === 1) return resp(503, 'busy');
    return resp(200, {
      value: [{ id: 'i9', deviceName: 'R', operatingSystem: 'Windows', emailAddress: 'r@co.com', serialNumber: 'R1' }],
    });
  };
  const ctx = makeCtx({ accessToken: 'tok', fetchImpl });
  const raw = await runCode(intuneCode, ctx);
  await test('retries a transient 503 then succeeds', () => {
    assert.equal(validate(raw).length, 1);
    assert(calls >= 2, 'should have retried after the 503');
  });
})();

await (async () => {
  const ctx = makeCtx({ accessToken: undefined, fetchImpl: async () => resp(200, { value: [] }) });
  await test('throws when there is no access token', () =>
    expectThrows(runCode(intuneCode, ctx), /no intune access token/i));
})();

// =========================================================================
// JumpCloud
// =========================================================================
console.log('JumpCloud device_sync:');

function jumpcloudFetch({ systems, users, bindings, failSystemsStatus, bindingStatus }) {
  return async (url, opts) => {
    const u = String(url);
    assert(opts && opts.headers && opts.headers['x-api-key'] === 'jc-key', 'must send x-api-key');
    // Honor skip/limit so the production pagination loop is actually exercised.
    const params = new URL(u).searchParams;
    const limit = Number(params.get('limit')) || 100;
    const skip = Number(params.get('skip')) || 0;
    const page = (arr) => ({ totalCount: arr.length, results: arr.slice(skip, skip + limit) });
    if (u.includes('/api/systems')) {
      if (failSystemsStatus) return resp(failSystemsStatus, 'nope');
      return resp(200, page(systems));
    }
    if (u.includes('/api/systemusers')) {
      return resp(200, page(users));
    }
    const m = u.match(/\/api\/v2\/users\/([^/?]+)\/systems/);
    if (m) {
      if (bindingStatus) return resp(bindingStatus, 'nope');
      return resp(200, bindings[m[1]] || []);
    }
    throw new Error('unexpected url ' + u);
  };
}

await (async () => {
  const systems = [
    { _id: 's1', displayName: 'Alice Mac', os: 'Mac OS X', serialNumber: 'SN1', hostname: 'alice-mac', version: '14.1' },
    { _id: 's2', displayName: 'Bob Win', os: 'Windows', serialNumber: 'SN2' },
    { _id: 's3', displayName: 'Orphan', os: 'Ubuntu', serialNumber: 'SN3' },
    { _id: 's4', displayName: 'Bob Linux', os: 'Ubuntu', serialNumber: 'SN4', active: false },
    { _id: 's5', displayName: 'Enrolling', os: '', serialNumber: 'SN5' },
  ];
  const users = [
    { _id: 'u1', email: 'Alice@CO.com' },
    { _id: 'u2', email: 'bob@co.com' },
    { _id: 'u3', email: '' },
    { _id: 'u4', email: 'dave@co.com' },
  ];
  const bindings = {
    u1: [{ id: 's1', type: 'system' }],
    u2: [{ id: 's2', type: 'system' }, { id: 's4', type: 'system' }],
    u3: [{ id: 's3', type: 'system' }],
    u4: [{ id: 's5', type: 'system' }],
  };
  const ctx = makeCtx({
    credentials: { api_key: 'jc-key' },
    fetchImpl: jumpcloudFetch({ systems, users, bindings }),
  });
  const raw = await runCode(jumpcloudCode, ctx);
  const devices = validate(raw);

  await test('joins systems→users→bindings and skips systems with no owner', () => {
    assert.equal(devices.length, 3); // s1, s2, s4 (s3 no email, s5 no os)
    assert(!devices.some((d) => d.externalId === 's3'), 's3 has no real owner → skipped');
  });

  await test('skips a system whose os is not yet reported (no mislabel as linux)', () => {
    assert(!devices.some((d) => d.externalId === 's5'), 's5 has empty os → skipped');
  });

  await test('maps Mac/Windows/Linux and lowercases owner email', () => {
    const byId = Object.fromEntries(devices.map((d) => [d.externalId, d]));
    assert.equal(byId.s1.platform, 'macos');
    assert.equal(byId.s1.userEmail, 'alice@co.com');
    assert.equal(byId.s2.platform, 'windows');
    assert.equal(byId.s4.platform, 'linux');
    assert.equal(byId.s4.userEmail, 'bob@co.com');
  });

  await test('reflects system.active in status and carries serial/hostname/osVersion', () => {
    const byId = Object.fromEntries(devices.map((d) => [d.externalId, d]));
    assert.equal(byId.s1.status, 'active');
    assert.equal(byId.s4.status, 'inactive');
    assert.equal(byId.s1.serialNumber, 'SN1');
    assert.equal(byId.s1.hostname, 'alice-mac');
    assert.equal(byId.s1.osVersion, '14.1');
  });
})();

await (async () => {
  const ctx = makeCtx({
    credentials: { api_key: 'jc-key' },
    fetchImpl: jumpcloudFetch({ systems: [], users: [], bindings: {}, failSystemsStatus: 401 }),
  });
  await test('throws a clear error on 401', () =>
    expectThrows(runCode(jumpcloudCode, ctx), /api key is invalid/i));
})();

await (async () => {
  // 150 systems each owned by its own user forces multi-page skip/limit fetches.
  const systems = [];
  const users = [];
  const bindings = {};
  for (let i = 0; i < 150; i++) {
    const sid = 's' + i;
    const uid = 'u' + i;
    systems.push({ _id: sid, displayName: 'Dev ' + i, os: 'Windows', serialNumber: 'SN' + i });
    users.push({ _id: uid, email: 'user' + i + '@co.com' });
    bindings[uid] = [{ id: sid, type: 'system' }];
  }
  const ctx = makeCtx({
    credentials: { api_key: 'jc-key' },
    fetchImpl: jumpcloudFetch({ systems, users, bindings }),
  });
  const devices = validate(await runCode(jumpcloudCode, ctx));
  await test('paginates systems + users across pages (skip/limit honored)', () => {
    assert.equal(devices.length, 150);
  });
})();

await (async () => {
  const systems = [{ _id: 's1', displayName: 'A', os: 'Windows', serialNumber: 'SN1' }];
  const users = [{ _id: 'u1', email: 'a@co.com' }];
  const ctx = makeCtx({
    credentials: { api_key: 'jc-key' },
    fetchImpl: jumpcloudFetch({ systems, users, bindings: {}, bindingStatus: 401 }),
  });
  await test('rethrows a 401 on the bindings call (no silent empty sync)', () =>
    expectThrows(runCode(jumpcloudCode, ctx), /api key is invalid/i));
})();

await (async () => {
  const systems = [{ _id: 's1', displayName: 'A', os: 'Windows', serialNumber: 'SN1' }];
  const users = [{ _id: 'u1', email: 'a@co.com' }];
  const ctx = makeCtx({
    credentials: { api_key: 'jc-key' },
    fetchImpl: jumpcloudFetch({ systems, users, bindings: {}, bindingStatus: 404 }),
  });
  const devices = validate(await runCode(jumpcloudCode, ctx));
  await test('skips a per-user 404 on bindings without failing the sync', () => {
    assert.equal(devices.length, 0); // s1 gets no owner → skipped, but no throw
  });
})();

await (async () => {
  const ctx = makeCtx({ credentials: {}, fetchImpl: async () => resp(200, {}) });
  await test('throws when API key is missing', () =>
    expectThrows(runCode(jumpcloudCode, ctx), /api key not found/i));
})();

// =========================================================================
console.log('');
if (failures > 0) {
  console.error(`${failures} test(s) failed`);
  process.exit(1);
}
console.log('All device_sync definition tests passed.');
