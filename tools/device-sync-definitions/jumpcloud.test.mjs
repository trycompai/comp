// JumpCloud device_sync definition tests. Run via test.mjs.

import assert from 'node:assert';
import { code as jumpcloudCode } from './jumpcloud.mjs';
import { test, resp, validate, runCode, makeCtx, expectThrows } from './harness.mjs';

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

console.log('JumpCloud device_sync:');

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
