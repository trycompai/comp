// JumpCloud `device_sync` definition.
//
// Source of truth for the deviceSyncDefinition authored into JumpCloud's DB row
// via the internal API (apply.mjs). See intune.mjs for why this lives in-repo.
//
// JumpCloud's catalog auth type is `custom`, so the interpreter injects NO auth
// header — the code reads the API key from ctx.credentials.api_key and sets the
// `x-api-key` header itself (mirroring the existing JumpCloud employee sync in
// apps/api/src/integration-platform/controllers/sync.controller.ts).
//
// JumpCloud devices ("systems") carry no owner email directly; ownership lives
// in the user→system bindings. We fetch systems + users, then per-user bindings
// to resolve each system's owner email (first bound user wins). A system with no
// bound user resolves to no email and is silently skipped by the import.

export const slug = 'jumpcloud';

export const code = `
const rawKey = ctx.credentials && ctx.credentials.api_key;
const apiKey = Array.isArray(rawKey) ? rawKey[0] : rawKey;
if (!apiKey) {
  throw new Error('JumpCloud API key not found — reconnect the integration.');
}

const headers = { 'x-api-key': apiKey, Accept: 'application/json' };

// Retry transient transport errors and 5xx/429 so one network blip doesn't
// abort the whole (scheduled) sync. Auth/4xx fall through to the error handling.
async function getJson(url) {
  let res;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await fetch(url, { headers: headers });
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 400 * attempt));
      continue;
    }
    if ((res.status >= 500 || res.status === 429) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 400 * attempt));
      continue;
    }
    break;
  }
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('JumpCloud API key is invalid — reconnect the integration.');
    }
    const body = await res.text();
    throw new Error('JumpCloud API error ' + res.status + ': ' + body.slice(0, 200));
  }
  return res.json();
}

// 1. All systems (devices), paginated by limit/skip.
const systemsById = {};
{
  const limit = 100;
  let skip = 0;
  let more = true;
  while (more) {
    // Stable sort so limit/skip paging stays consistent if records change mid-sync.
    const data = await getJson(
      'https://console.jumpcloud.com/api/systems?limit=' + limit + '&skip=' + skip + '&sort=_id',
    );
    const results = (data && data.results) || [];
    for (const s of results) systemsById[s._id] = s;
    skip += results.length;
    more = results.length === limit && skip < (data.totalCount || 0);
    if (results.length === 0) more = false;
  }
}

// 2. All users, paginated.
const users = [];
{
  const limit = 100;
  let skip = 0;
  let more = true;
  while (more) {
    // Stable sort (matches the employee sync) so paging stays consistent.
    const data = await getJson(
      'https://console.jumpcloud.com/api/systemusers?limit=' + limit + '&skip=' + skip + '&sort=email',
    );
    const results = (data && data.results) || [];
    users.push.apply(users, results);
    skip += results.length;
    more = results.length === limit && skip < (data.totalCount || 0);
    if (results.length === 0) more = false;
  }
}

// 3. Resolve each system's owner email via user→system bindings (first wins).
const ownerEmailBySystemId = {};
for (const user of users) {
  const email = String(user.email || '').trim().toLowerCase();
  if (!email) continue;
  let bindings;
  try {
    // limit=100 (the v2 max) so a user bound to many systems isn't truncated at
    // the default page size of 10.
    bindings = await getJson(
      'https://console.jumpcloud.com/api/v2/users/' + user._id + '/systems?limit=100',
    );
  } catch (e) {
    continue; // ignore per-user binding errors, keep going
  }
  if (!Array.isArray(bindings)) continue;
  for (const b of bindings) {
    if (b && b.id && !ownerEmailBySystemId[b.id]) {
      ownerEmailBySystemId[b.id] = email;
    }
  }
}

// 4. Emit a SyncDevice per system that has a resolvable owner.
function mapPlatform(os) {
  const v = String(os || '').trim().toLowerCase();
  if (!v) return null; // os not reported yet — skip rather than mislabel as linux
  if (v.includes('mac') || v.includes('os x') || v.includes('darwin')) return 'macos';
  if (v.includes('windows')) return 'windows';
  // JumpCloud manages only Mac/Windows/Linux, so any other non-empty os is Linux.
  return 'linux';
}

const devices = [];
for (const id in systemsById) {
  const s = systemsById[id];
  const email = ownerEmailBySystemId[id];
  if (!email) continue;

  const platform = mapPlatform(s.os);
  if (!platform) continue;

  const serial = String(s.serialNumber || '').trim();
  const externalId = String(s._id || '');
  if (!serial && !externalId) continue;

  const name = String(s.displayName || s.hostname || serial || externalId);
  const device = {
    name: name,
    platform: platform,
    userEmail: email,
    status: s.active === false ? 'inactive' : 'active',
    externalId: externalId,
  };
  if (serial) device.serialNumber = serial;
  if (s.hostname) device.hostname = String(s.hostname);
  if (s.version) device.osVersion = String(s.version);
  devices.push(device);
}

ctx.log('JumpCloud device sync mapped ' + devices.length + ' devices');
scope.devices = devices;
`;

export const deviceSyncDefinition = {
  steps: [{ type: 'code', code }],
  devicesPath: 'devices',
  isDirectorySource: false,
};
