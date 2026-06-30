// Intune device_sync definition tests. Run via test.mjs (or standalone:
// `node tools/device-sync-definitions/intune.test.mjs` + report() won't run).

import assert from 'node:assert';
import { code as intuneCode } from './intune.mjs';
import { test, resp, validate, runCode, makeCtx, expectThrows } from './harness.mjs';

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
