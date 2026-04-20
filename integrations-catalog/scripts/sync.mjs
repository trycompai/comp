#!/usr/bin/env node

import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync, renameSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const INTEGRATIONS_DIR = join(ROOT, "integrations");
const INDEX_FILE = join(ROOT, "index.json");

const API_BASE = process.env.COMPAI_INTERNAL_API_BASE || "https://api.trycomp.ai/v1/internal";
const TOKEN = process.env.COMPAI_INTERNAL_TOKEN;

if (!TOKEN) {
  console.error("COMPAI_INTERNAL_TOKEN is required");
  process.exit(1);
}

const HEADERS = { "X-Internal-Token": TOKEN, "Accept": "application/json" };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(path, maxRetries = 5) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(`${API_BASE}${path}`, { headers: HEADERS });
    if (res.ok) return res.json();
    const text = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < maxRetries - 1) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "0", 10);
      const delay = retryAfter > 0 ? retryAfter * 1000 : Math.min(1000 * Math.pow(2, attempt), 15000);
      lastError = new Error(`${path} HTTP ${res.status}: ${text.slice(0, 200)}`);
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
    logoUrl: integration.logoUrl,
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
    console.log(`After dedup: ${deduped.length} unique slugs (dropped ${list.length - deduped.length}).`);
  }

  const CONCURRENCY = parseInt(process.env.SYNC_CONCURRENCY || "3", 10);
  const queue = [...deduped];
  const results = { written: 0, unchanged: 0, failed: 0 };
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
        if (completed % 50 === 0) console.log(`  ${completed}/${deduped.length} (written=${results.written} unchanged=${results.unchanged})`);
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
    console.log(`\n${results.failed} fetch(es) failed — their existing files are preserved.`);
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
  console.log(`  stale removed: ${staleFiles.length}`);
  console.log(`  total in index: ${index.length}`);

  if (results.failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
