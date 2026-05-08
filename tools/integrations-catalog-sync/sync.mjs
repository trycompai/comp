#!/usr/bin/env node

import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync, renameSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const CATALOG_ROOT = join(REPO_ROOT, "integrations-catalog");
const INTEGRATIONS_DIR = join(CATALOG_ROOT, "integrations");
const INDEX_FILE = join(CATALOG_ROOT, "index.json");

const API_BASE = process.env.COMPAI_INTERNAL_API_BASE;
const TOKEN = process.env.COMPAI_INTERNAL_TOKEN;

if (!API_BASE) {
  console.error("COMPAI_INTERNAL_API_BASE env var is required");
  process.exit(1);
}
if (!TOKEN) {
  console.error("COMPAI_INTERNAL_TOKEN env var is required");
  process.exit(1);
}

const HEADERS = { "X-Internal-Token": TOKEN, "Accept": "application/json" };

const SECRET_PATTERNS = [
  /\b(pk|sk)_(live|test)_[a-zA-Z0-9]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bsk-ant-[a-zA-Z0-9_-]{30,}/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
  /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}/,
  /\bjina_[a-zA-Z0-9]{20,}/,
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /Bearer\s+[A-Za-z0-9._~+\/=-]{20,}/,
  /token=pk_[A-Za-z0-9]{15,}/
];

function scanSecrets(value, path = "") {
  const hits = [];
  if (value == null) return hits;
  if (typeof value === "string") {
    for (const re of SECRET_PATTERNS) {
      if (re.test(value)) hits.push(path);
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => hits.push(...scanSecrets(v, `${path}[${i}]`)));
  } else if (typeof value === "object") {
    for (const k of Object.keys(value)) hits.push(...scanSecrets(value[k], path ? `${path}.${k}` : k));
  }
  return hits;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MIN_REQUEST_INTERVAL_MS = parseInt(process.env.SYNC_MIN_INTERVAL_MS || "100", 10);
let nextAllowedAt = 0;

async function pace() {
  const now = Date.now();
  if (now < nextAllowedAt) await sleep(nextAllowedAt - now);
  nextAllowedAt = Date.now() + MIN_REQUEST_INTERVAL_MS;
}

async function fetchJson(path, maxRetries = 5) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    await pace();
    const res = await fetch(`${API_BASE}${path}`, { headers: HEADERS });
    if (res.ok) return res.json();
    const text = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < maxRetries - 1) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "0", 10);
      const delay = retryAfter > 0 ? retryAfter * 1000 : Math.min(1000 * Math.pow(2, attempt), 15000);
      lastError = new Error(`${path} HTTP ${res.status}: ${text.slice(0, 200)}`);
      console.warn(`  ${path} → ${res.status}, backing off ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(delay);
      continue;
    }
    throw new Error(`${path} HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  throw lastError;
}

function sanitizeCredentialField(field) {
  return {
    label: field.label,
    type: field.type,
    required: field.required ?? false,
    helpText: field.helpText
  };
}

function sanitizeAuthConfig(authConfig) {
  if (!authConfig || typeof authConfig !== "object") return null;
  const { type, config = {} } = authConfig;
  const {
    setupInstructions,
    createAppUrl,
    setupScript,
    credentialFields = [],
    usernameField,
    passwordField,
    scopes,
    clientAuthMethod,
    supportsRefreshToken
  } = config;

  const publicConfig = {};
  if (setupInstructions) publicConfig.setupInstructions = setupInstructions;
  if (createAppUrl) publicConfig.createAppUrl = createAppUrl;
  if (setupScript) publicConfig.setupScript = setupScript;
  if (Array.isArray(credentialFields) && credentialFields.length > 0) {
    publicConfig.credentialFields = credentialFields.map(sanitizeCredentialField);
  }
  if (usernameField) publicConfig.usernameField = usernameField;
  if (passwordField) publicConfig.passwordField = passwordField;
  if (Array.isArray(scopes)) publicConfig.scopes = scopes;
  if (clientAuthMethod) publicConfig.clientAuthMethod = clientAuthMethod;
  if (typeof supportsRefreshToken === "boolean") publicConfig.supportsRefreshToken = supportsRefreshToken;

  return { type, config: publicConfig };
}

function sanitizeCheck(check) {
  return {
    slug: check.checkSlug,
    name: check.name,
    description: check.description,
    defaultSeverity: check.defaultSeverity,
    enabled: check.isEnabled ?? true
  };
}

function sanitize(integration) {
  return {
    slug: integration.slug,
    name: integration.name,
    description: integration.description,
    category: integration.category,
    docsUrl: integration.docsUrl,
    baseUrl: integration.baseUrl,
    authConfig: sanitizeAuthConfig(integration.authConfig),
    capabilities: integration.capabilities ?? [],
    supportsMultipleConnections: integration.supportsMultipleConnections ?? false,
    syncSupported: integration.syncDefinition != null,
    checks: Array.isArray(integration.checks) ? integration.checks.map(sanitizeCheck) : [],
    checkCount: Array.isArray(integration.checks) ? integration.checks.length : 0,
    isActive: integration.isActive ?? true
  };
}

function normalizeSlug(slug) {
  return String(slug || "").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

function slugToFilename(slug) {
  return `${normalizeSlug(slug)}.json`;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function atomicWrite(targetPath, content) {
  const tmp = `${targetPath}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, targetPath);
}

async function main() {
  mkdirSync(INTEGRATIONS_DIR, { recursive: true });

  console.log(`Fetching integration list from ${API_BASE}...`);
  const list = await fetchJson("/dynamic-integrations");
  console.log(`Found ${list.length} integrations from API.`);

  const seenSlugs = new Map();
  const expectedSlugs = new Set();
  const deduped = [];
  for (const item of list) {
    const slug = normalizeSlug(item.slug);
    if (!slug) {
      console.warn(`  skipped: no slug on id=${item.id}`);
      continue;
    }
    if (seenSlugs.has(slug)) {
      console.warn(`  duplicate slug="${slug}" (ids=${seenSlugs.get(slug)}, ${item.id}) — keeping first`);
      continue;
    }
    seenSlugs.set(slug, item.id);
    expectedSlugs.add(slug);
    deduped.push(item);
  }
  if (deduped.length !== list.length) {
    console.log(`After dedup: ${deduped.length} unique slugs.`);
  }

  const CONCURRENCY = parseInt(process.env.SYNC_CONCURRENCY || "2", 10);
  const queue = [...deduped];
  const results = { written: 0, unchanged: 0, failed: 0, secretsBlocked: 0 };
  const fetchedSlugs = new Set();
  const index = [];
  let completed = 0;

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const slug = normalizeSlug(item.slug);
      try {
        const full = await fetchJson(`/dynamic-integrations/${item.id}`);
        const sanitized = sanitize(full);
        sanitized.slug = normalizeSlug(sanitized.slug);

        const hits = scanSecrets(sanitized);
        if (hits.length > 0) {
          results.secretsBlocked++;
          console.error(`  [${slug}] BLOCKED: secret pattern at ${hits.join(", ")}`);
          continue;
        }

        const filename = slugToFilename(sanitized.slug);
        const filepath = join(INTEGRATIONS_DIR, filename);
        const content = JSON.stringify(sanitized, null, 2) + "\n";
        const newHash = sha256(content);
        let unchanged = false;
        if (existsSync(filepath)) {
          const existing = readFileSync(filepath, "utf8");
          if (sha256(existing) === newHash) unchanged = true;
        }
        if (!unchanged) {
          atomicWrite(filepath, content);
          results.written++;
        } else {
          results.unchanged++;
        }
        fetchedSlugs.add(sanitized.slug);
        index.push({
          slug: sanitized.slug,
          name: sanitized.name,
          category: sanitized.category,
          authType: sanitized.authConfig?.type,
          checkCount: sanitized.checkCount,
          syncSupported: sanitized.syncSupported,
          file: `integrations/${filename}`
        });
        completed++;
        if (completed % 50 === 0) console.log(`  ${completed}/${deduped.length}`);
      } catch (e) {
        results.failed++;
        console.error(`  [${slug}] ${e.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const staleFiles = readdirSync(INTEGRATIONS_DIR)
    .filter((f) => f.endsWith(".json"))
    .filter((f) => {
      const slug = f.replace(/\.json$/, "");
      return !expectedSlugs.has(slug);
    });

  for (const stale of staleFiles) {
    unlinkSync(join(INTEGRATIONS_DIR, stale));
    console.log(`  removed stale: ${stale}`);
  }

  if (results.failed > 0) {
    for (const item of deduped) {
      const slug = normalizeSlug(item.slug);
      if (fetchedSlugs.has(slug)) continue;
      const filename = slugToFilename(slug);
      const filepath = join(INTEGRATIONS_DIR, filename);
      if (existsSync(filepath)) {
        const existing = JSON.parse(readFileSync(filepath, "utf8"));
        index.push({
          slug,
          name: existing.name,
          category: existing.category,
          authType: existing.authConfig?.type,
          checkCount: existing.checkCount,
          syncSupported: existing.syncSupported,
          file: `integrations/${filename}`,
          stale: true
        });
      }
    }
  }

  index.sort((a, b) => a.name.localeCompare(b.name));
  const summary = {
    generatedAt: new Date().toISOString(),
    total: index.length,
    sourceCount: list.length,
    uniqueSlugs: expectedSlugs.size,
    byCategory: index.reduce((acc, i) => {
      const c = i.category || "Uncategorized";
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {}),
    integrations: index
  };
  atomicWrite(INDEX_FILE, JSON.stringify(summary, null, 2) + "\n");

  console.log(`\nDone.`);
  console.log(`  written: ${results.written}`);
  console.log(`  unchanged: ${results.unchanged}`);
  console.log(`  failed: ${results.failed}`);
  console.log(`  secrets blocked: ${results.secretsBlocked}`);
  console.log(`  stale removed: ${staleFiles.length}`);
  console.log(`  total in index: ${index.length}`);

  if (results.failed > 0 || results.secretsBlocked > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
