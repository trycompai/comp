import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { resolveSslConfig } from './ssl-config';

export type { SslConfig } from './ssl-config';
export { resolveSslConfig } from './ssl-config';

/**
 * RLS (Row-Level Security) client roles.
 *
 * The app normally connects as a non-superuser role so PostgreSQL row policies
 * (see `packages/db/prisma/migrations/*_add_rls_roles_and_tenant_policies`)
 * actually enforce tenant isolation. Three clients exist:
 *
 *  - `db`        — legacy client (superuser / owner). Bypasses RLS. Used by
 *                  code that has not yet been migrated to a tenant context.
 *  - `tenantDb`  — connects as the RLS-subject app role. Every query must run
 *                  inside `withTenant(orgId, ...)` to set the tenant GUC,
 *                  otherwise policies fail closed (no rows visible).
 *  - `serviceDb` — connects as the BYPASSRLS service role for system,
 *                  background, cron and auth (better-auth) access.
 *
 * URL resolution: `DATABASE_URL_TENANT` / `DATABASE_URL_SERVICE` when set,
 * otherwise falls back to `DATABASE_URL`. The fallback keeps environments that
 * haven't configured the RLS roles on the legacy client (no behavior change);
 * wire the dedicated URLs to turn enforcement on.
 */

const globalForPrisma = global as unknown as { prismaClients?: Map<string, PrismaClient> };

function stripSslMode(connectionString: string): string {
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  return url.toString();
}

function createPrismaClient(connectionString: string): PrismaClient {
  const ssl = resolveSslConfig(connectionString);
  const url = ssl !== undefined ? stripSslMode(connectionString) : connectionString;
  const adapter = new PrismaPg({ connectionString: url, ssl });
  return new PrismaClient({
    adapter,
    transactionOptions: { timeout: 60000 },
  });
}

// Lazy initialization. Importing this module does NOT construct any Prisma
// client — that only happens on first property access. Critical so that
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

// Exported for tests: returns the DATABASE_URL_* value, falling back to
// DATABASE_URL when the dedicated RLS URL is unset.
export { resolveConnectionString };

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
 *
 * The tenant GUC is set transaction-locally (`set_config(..., true)`), so it is
 * cleared on commit/rollback and never leaks to other connections in the pool.
 * Without this, `tenantDb` policies match nothing and queries return no rows.
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
 * Run `fn` as the service role (BYPASSRLS) inside a single transaction.
 * Clears any stale tenant GUC so system reads never inherit a leftover tenant.
 */
export async function withService<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return serviceDb.$transaction(async (tx) => {
    await setTenantGuc(tx, '');
    return fn(tx);
  });
}
