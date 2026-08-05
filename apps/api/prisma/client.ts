import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * RLS (Row-Level Security) client roles — mirrors `packages/db/src/client.ts`.
 *
 *  - `db`        — legacy client (superuser / owner). Bypasses RLS.
 *  - `tenantDb`  — RLS-subject app role; use inside `withTenant(orgId, ...)`.
 *  - `serviceDb` — BYPASSRLS service role for better-auth/system/background.
 *
 * URLs resolve from `DATABASE_URL_TENANT` / `DATABASE_URL_SERVICE` and fall
 * back to `DATABASE_URL` when unset.
 */

const globalForPrisma = global as unknown as { prismaClients?: Map<string, PrismaClient> };

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function stripSslMode(connectionString: string): string {
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  return url.toString();
}

function isLocalhostUrl(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    // Strip square brackets from IPv6 host form (e.g. [::1] → ::1)
    const stripped = hostname.replace(/^\[/, '').replace(/\]$/, '');
    return LOCAL_HOSTNAMES.has(stripped);
  } catch {
    // Malformed URL — be conservative and treat as remote so we don't
    // accidentally disable TLS verification.
    return false;
  }
}

// Explicit sslmode=disable means the operator intends a plaintext connection
// (e.g. a local/self-hosted Postgres without TLS). Treat it like localhost.
function hasSslModeDisable(connectionString: string): boolean {
  try {
    return new URL(connectionString).searchParams.get('sslmode') === 'disable';
  } catch {
    return false;
  }
}

function createPrismaClient(rawUrl: string): PrismaClient {
  const isLocalhost = isLocalhostUrl(rawUrl) || hasSslModeDisable(rawUrl);
  // Strategy:
  // - Localhost: TLS off (typical dev Postgres has no cert).
  // - Remote with NODE_EXTRA_CA_CERTS set: verified TLS using that bundle
  //   (e.g. Docker with the RDS CA bundle baked in).
  // - Remote in explicit opt-out mode (PRISMA_ALLOW_INSECURE_TLS=1):
  //   unverified TLS — used by Trigger.dev / Vercel envs that connect via
  //   a tunneled proxy whose cert can't be pinned. Must be set deliberately;
  //   the previous default ("just turn off verification") silently exposed
  //   prod connections to MITM. (Cubic finding #1 on PR #2671.)
  // - Remote with neither: throw at boot — surface the misconfig instead of
  //   silently downgrading.
  const hasCABundle = !!process.env.NODE_EXTRA_CA_CERTS;
  const allowInsecure = process.env.PRISMA_ALLOW_INSECURE_TLS === '1';
  let ssl:
    | undefined
    | { checkServerIdentity: () => undefined }
    | { rejectUnauthorized: false };
  if (isLocalhost) {
    ssl = undefined;
  } else if (hasCABundle) {
    // Verified TLS: rely on Node's TLS context (NODE_EXTRA_CA_CERTS adds the AWS
    // RDS CA to the trust store). Skip hostname check because connections may
    // traverse an AWS NLB whose hostname isn't in the RDS Proxy cert's SAN list.
    // The chain check still rejects forged or wrong-CA certs.
    ssl = { checkServerIdentity: () => undefined };
  } else if (allowInsecure) {
    ssl = { rejectUnauthorized: false };
  } else {
    throw new Error(
      'Refusing to connect to a non-local Postgres without TLS verification. Set NODE_EXTRA_CA_CERTS to a CA bundle, or set PRISMA_ALLOW_INSECURE_TLS=1 if you intentionally want unverified TLS.',
    );
  }
  // Strip sslmode from the connection string to avoid conflicts with the explicit ssl option
  const url = stripSslMode(rawUrl);
  const adapter = new PrismaPg({ connectionString: url, ssl });
  return new PrismaClient({
    adapter,
    transactionOptions: {
      timeout: 60000,
    },
  });
}

// Lazy initialization. Importing this module does NOT construct a Prisma client
// — that only happens on first property access on `db`. Critical so that
// Next.js `next build` (which imports every route handler to analyze it) does
// not trigger the strict TLS check at build time when no actual queries run.
function getClientByUrl(url: string): PrismaClient {
  if (!globalForPrisma.prismaClients) {
    globalForPrisma.prismaClients = new Map();
  }
  const existing = globalForPrisma.prismaClients.get(url);
  if (existing) return existing;
  const client = createPrismaClient(url);
  globalForPrisma.prismaClients.set(url, client);
  return client;
}

function resolveConnectionString(envVar: string): string {
  return process.env[envVar] ?? process.env.DATABASE_URL!;
}

function lazyClient(envVar: string): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, prop, _receiver) {
      const client = getClientByUrl(resolveConnectionString(envVar));
      const value = Reflect.get(client, prop, client);
      return typeof value === 'function' ? value.bind(client) : value;
    },
  });
}

export const db = lazyClient('DATABASE_URL');

export const tenantDb = lazyClient('DATABASE_URL_TENANT');

export const serviceDb = lazyClient('DATABASE_URL_SERVICE');

const TENANT_GUC = 'app.tenant_id';

async function setTenantGuc(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT set_config(${TENANT_GUC}, ${tenantId}, true)`;
}

/**
 * Run `fn` inside a single transaction scoped to `orgId` under RLS.
 * The tenant GUC is set transaction-locally and cleared on commit/rollback.
 */
export async function withTenant<T>(
  orgId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return tenantDb.$transaction(async (tx) => {
    await setTenantGuc(tx, orgId);
    return fn(tx);
  });
}

/**
 * Run `fn` as the service role (BYPASSRLS) inside a single transaction,
 * clearing any stale tenant GUC first.
 */
export async function withService<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return serviceDb.$transaction(async (tx) => {
    await setTenantGuc(tx, '');
    return fn(tx);
  });
}
