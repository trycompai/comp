// Applies a device_sync definition to a dynamic integration's DB row via the
// internal API. The DSL bodies live in intune.mjs / jumpcloud.mjs (version
// controlled); this script merges one in without disturbing existing checks.
//
// Usage:
//   export COMPAI_INTERNAL_API_BASE="https://api.staging.trycomp.ai/v1/internal"
//   export COMPAI_INTERNAL_TOKEN="<token>"
//   node tools/device-sync-definitions/apply.mjs intune            # dry run (prints plan)
//   node tools/device-sync-definitions/apply.mjs intune --yes      # actually write
//
// Same env-var convention as tools/integrations-catalog-sync. Run against
// STAGING first, smoke-test a real connection, then prod.
//
// Safety: the internal PUT is a FULL upsert that DELETES checks not present in
// the body, so this script fetches the full integration (with every check) and
// re-sends them verbatim, only ADDING the device_sync capability + definition.

import { deviceSyncDefinition as intuneDef } from './intune.mjs';
import { deviceSyncDefinition as jumpcloudDef } from './jumpcloud.mjs';

const DEFS = { intune: intuneDef, jumpcloud: jumpcloudDef };

const slug = process.argv[2];
const confirm = process.argv.includes('--yes');

const API_BASE = process.env.COMPAI_INTERNAL_API_BASE;
const TOKEN = process.env.COMPAI_INTERNAL_TOKEN;

function die(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

if (!slug || !DEFS[slug]) {
  die(`pass a slug: one of ${Object.keys(DEFS).join(', ')}`);
}
if (!API_BASE) die('COMPAI_INTERNAL_API_BASE env var is required');
if (!TOKEN) die('COMPAI_INTERNAL_TOKEN env var is required');

const HEADERS = { 'x-internal-token': TOKEN, 'Content-Type': 'application/json' };

async function api(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...HEADERS, ...(init.headers || {}) },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    die(`${init.method || 'GET'} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return json;
}

// Strip DB-only/null fields so the body matches DynamicIntegrationDefinitionSchema.
function mapCheck(c) {
  const out = {
    checkSlug: c.checkSlug,
    name: c.name,
    description: c.description,
    definition: c.definition,
  };
  if (c.taskMapping != null) out.taskMapping = c.taskMapping;
  if (c.defaultSeverity != null) out.defaultSeverity = c.defaultSeverity;
  if (c.service != null) out.service = c.service;
  if (Array.isArray(c.variables)) out.variables = c.variables;
  if (typeof c.isEnabled === 'boolean') out.isEnabled = c.isEnabled;
  if (typeof c.sortOrder === 'number') out.sortOrder = c.sortOrder;
  return out;
}

async function main() {
  console.log(`Looking up "${slug}" at ${API_BASE} ...`);
  const list = await api('/dynamic-integrations');
  const found = (Array.isArray(list) ? list : []).find((i) => i.slug === slug);
  if (!found) {
    die(`No dynamic integration with slug "${slug}" found. (Is it a code manifest, or not authored yet?)`);
  }

  const integ = await api(`/dynamic-integrations/${found.id}`);
  const currentCaps = Array.isArray(integ.capabilities) ? integ.capabilities : ['checks'];
  const checks = Array.isArray(integ.checks) ? integ.checks : [];

  const nextCaps = Array.from(new Set([...currentCaps, 'device_sync']));

  const body = {
    slug: integ.slug,
    name: integ.name,
    description: integ.description,
    category: integ.category,
    logoUrl: integ.logoUrl,
    authConfig: integ.authConfig,
    capabilities: nextCaps,
    checks: checks.map(mapCheck),
    deviceSyncDefinition: DEFS[slug],
  };
  if (integ.docsUrl) body.docsUrl = integ.docsUrl;
  if (integ.baseUrl) body.baseUrl = integ.baseUrl;
  if (integ.defaultHeaders) body.defaultHeaders = integ.defaultHeaders;
  if (typeof integ.supportsMultipleConnections === 'boolean') {
    body.supportsMultipleConnections = integ.supportsMultipleConnections;
  }
  if (integ.syncDefinition) body.syncDefinition = integ.syncDefinition;
  if (Array.isArray(integ.services) && integ.services.length > 0) {
    body.services = integ.services;
  }

  console.log('\nPlan:');
  console.log(`  integration : ${integ.slug} (${found.id})`);
  console.log(`  capabilities: [${currentCaps.join(', ')}] → [${nextCaps.join(', ')}]`);
  console.log(`  checks kept : ${body.checks.length} (re-sent verbatim)`);
  console.log(`  deviceSync  : ${DEFS[slug].steps.length} step(s), devicesPath="${DEFS[slug].devicesPath}", isDirectorySource=${DEFS[slug].isDirectorySource}`);
  console.log(`  syncDef kept: ${body.syncDefinition ? 'yes' : 'no'}`);

  if (!confirm) {
    console.log('\nDry run only. Re-run with --yes to apply.');
    return;
  }

  console.log('\nApplying (PUT) ...');
  const result = await api('/dynamic-integrations', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  console.log(`  upserted: ${result.slug} (${result.checksCount} checks)`);

  // Verify the write landed. The internal upsert rewrites the integration and
  // re-creates checks in separate (non-transactional) steps, so also assert the
  // check count is intact — a partial failure could otherwise drop checks.
  const after = await api(`/dynamic-integrations/${found.id}`);
  const afterCaps = Array.isArray(after.capabilities) ? after.capabilities : [];
  const afterChecks = Array.isArray(after.checks) ? after.checks.length : 0;
  if (!afterCaps.includes('device_sync') || !after.deviceSyncDefinition) {
    die(`Verification failed: capabilities=${JSON.stringify(afterCaps)} hasDeviceSyncDefinition=${!!after.deviceSyncDefinition}`);
  }
  if (afterChecks !== body.checks.length) {
    die(`Verification failed: expected ${body.checks.length} checks, found ${afterChecks} — the upsert may have partially applied. Re-run to restore.`);
  }
  console.log(`  verified: device_sync capability + deviceSyncDefinition present, ${afterChecks} checks intact. ✅`);
  console.log('\nDone. The selector/scheduler pick up the new capability within ~60s (registry refresh).');
}

main().catch((e) => die(e.message));
