// Microsoft Intune `device_sync` definition.
//
// This is the source of truth for the `deviceSyncDefinition` that gets authored
// into the Intune dynamic integration's DB row via the internal API (apply.mjs).
// It lives in-repo deliberately: the DB is the only live store for sync DSL and
// the public integrations-catalog export strips it, so without this file the
// definition would be un-versioned and unrecoverable.
//
// Contract (packages/integration-platform/src/dsl/types.ts → SyncDeviceSchema):
//   required: name, platform (macos|windows|linux), userEmail, status (active|inactive)
//   optional: serialNumber, externalId, hostname, osVersion, hardwareModel
// The import (GenericDeviceSyncService) matches each device to a member by
// lowercased userEmail; a device with no resolvable email is silently skipped.
//
// Auth: Intune is OAuth2, so the interpreter injects `ctx.accessToken` (a Graph
// bearer token). Scope DeviceManagementManagedDevices.Read.All is already
// configured on the connection.

export const slug = 'intune';

// Executed by the DSL interpreter as `new AsyncFunction('ctx','scope', code)`.
// Must populate `scope.devices`.
export const code = `
const token = ctx.accessToken;
if (!token) {
  throw new Error('No Intune access token — reconnect the integration.');
}

// Retry transient transport errors and 5xx/429 so a single network blip on one
// page doesn't abort the whole (scheduled) sync. Auth/4xx are returned as-is.
async function fetchRetry(u, opts) {
  for (let attempt = 1; ; attempt++) {
    let r;
    try {
      r = await fetch(u, opts);
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((res) => setTimeout(res, 400 * attempt));
      continue;
    }
    if ((r.status >= 500 || r.status === 429) && attempt < 3) {
      await new Promise((res) => setTimeout(res, 400 * attempt));
      continue;
    }
    return r;
  }
}

const devices = [];
let url = 'https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$top=100';
let pages = 0;
// Generous safety backstop against an infinite pagination loop (~100k devices).
// Real tenants stay well under this; hitting it means something is wrong, so we
// fail loudly below rather than report a partial sync as success.
const MAX_PAGES = 1000;

while (url && pages < MAX_PAGES) {
  pages++;
  const res = await fetchRetry(url, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        'Intune authorization failed (' + res.status + '). Reconnect the integration or grant DeviceManagementManagedDevices.Read.All.',
      );
    }
    const body = await res.text();
    throw new Error('Intune Graph error ' + res.status + ': ' + body.slice(0, 300));
  }

  const data = await res.json();
  const list = Array.isArray(data.value) ? data.value : [];

  for (const d of list) {
    // Platform: the schema is desktop-only. Drop iOS/Android/unknown.
    const osRaw = String(d.operatingSystem || '').toLowerCase();
    let platform = null;
    if (osRaw.includes('windows')) platform = 'windows';
    else if (osRaw.includes('mac') || osRaw.includes('os x')) platform = 'macos';
    else if (osRaw.includes('linux')) platform = 'linux';
    if (!platform) continue;

    // Owner email: emailAddress, fall back to userPrincipalName (on Entra/M365
    // tenants the UPN equals the user's email). No owner ⇒ import skips it.
    const email = String(d.emailAddress || d.userPrincipalName || '').trim().toLowerCase();
    if (!email) continue;

    const serial = String(d.serialNumber || '').trim();
    const externalId = d.id ? String(d.id) : '';
    if (!serial && !externalId) continue;

    const name = String(d.deviceName || d.managedDeviceName || serial || externalId);

    const device = { name: name, platform: platform, userEmail: email, status: 'active' };
    if (serial) device.serialNumber = serial;
    if (externalId) device.externalId = externalId;
    if (d.osVersion) device.osVersion = String(d.osVersion);
    if (d.model) device.hardwareModel = String(d.model);
    if (d.deviceName) device.hostname = String(d.deviceName);
    devices.push(device);
  }

  url = data['@odata.nextLink'] || null;
}

// If there are still more pages after the cap, abort rather than silently
// importing a partial fleet as a "successful" sync.
if (url) {
  throw new Error(
    'Intune device sync exceeded ' + MAX_PAGES + ' pages without finishing — aborting to avoid a partial import.',
  );
}

ctx.log('Intune device sync mapped ' + devices.length + ' devices');
scope.devices = devices;
`;

export const deviceSyncDefinition = {
  steps: [{ type: 'code', code }],
  devicesPath: 'devices',
  isDirectorySource: false,
};
