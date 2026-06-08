import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { ARM_BASE, armListAllOrFail, resolveAzureSubscriptionId } from './shared';

// Pinned stable api-version for Azure Database for PostgreSQL Flexible Server.
// NOTE: PostgreSQL is a SEPARATE resource provider from MySQL with its own
// version train — do NOT reuse the MySQL check's 2023-12-30.
const POSTGRES_API_VERSION = '2024-08-01';

interface PgFlexibleServer {
  id: string;
  name: string;
}

interface PgConfiguration {
  properties?: { value?: string };
}

// TLS enforcement on PostgreSQL Flexible Server is controlled by SERVER
// PARAMETERS (configurations), not a top-level property:
//   - require_secure_transport: ON/OFF  (forces SSL/TLS; default ON)
//   - ssl_min_protocol_version: a SINGLE floor value (TLSv1.2 / TLSv1.3). Unlike
//     MySQL's comma-separated `tls_version`, this is one value, and it may be
//     UNSET by default — PostgreSQL Flexible Server only permits TLS 1.2/1.3 and
//     denies 1.0/1.1 regardless, so an unset floor still means TLS >= 1.2.
const TLS_ALLOWED_VERSIONS = new Set(['TLSV1.2', 'TLSV1.3']);

/**
 * True when `ssl_min_protocol_version` permits only TLS 1.2+. An empty/unset
 * value is treated as compliant: PostgreSQL Flexible Server only supports TLS
 * 1.2/1.3 and rejects 1.0/1.1 by default, so the effective floor is already 1.2.
 * Comparison is case-insensitive.
 */
export function isPgTlsVersionCompliant(sslMinProtocolVersion: string): boolean {
  const v = sslMinProtocolVersion.trim().toUpperCase();
  if (v === '') return true;
  return TLS_ALLOWED_VERSIONS.has(v);
}

/**
 * Pure evaluator: decide compliance from the two server-parameter values.
 * `require_secure_transport == ON` is the real determinant of TLS enforcement;
 * the SSL floor is additionally checked but an unset value is fine (see above).
 */
export function evaluatePgTls(
  requireSecureTransport: string,
  sslMinProtocolVersion: string,
): { compliant: boolean; issues: string[] } {
  const issues: string[] = [];
  if (requireSecureTransport.trim().toUpperCase() !== 'ON') {
    issues.push('secure transport not required (require_secure_transport is OFF)');
  }
  if (!isPgTlsVersionCompliant(sslMinProtocolVersion)) {
    issues.push(
      `minimum TLS below 1.2 (ssl_min_protocol_version: ${sslMinProtocolVersion})`,
    );
  }
  return { compliant: issues.length === 0, issues };
}

async function listPgFlexibleServers(
  ctx: CheckContext,
  sub: string,
): Promise<PgFlexibleServer[] | null> {
  return armListAllOrFail<PgFlexibleServer>(
    ctx,
    `${ARM_BASE}/subscriptions/${sub}/providers/Microsoft.DBforPostgreSQL/flexibleServers?api-version=${POSTGRES_API_VERSION}`,
    {
      what: 'PostgreSQL flexible servers',
      resourceType: 'azure-postgresql-flexible-server',
      subscriptionId: sub,
    },
  );
}

/**
 * Read a single server configuration value. Returns null when the read fails
 * (permission/transient) or the value is absent.
 */
async function readConfigValue(
  ctx: CheckContext,
  serverId: string,
  name: string,
): Promise<string | null> {
  const res = await ctx
    .fetch<PgConfiguration>(
      `${ARM_BASE}${serverId}/configurations/${name}?api-version=${POSTGRES_API_VERSION}`,
    )
    .catch(() => null);
  const value = res?.properties?.value;
  return typeof value === 'string' ? value : null;
}

/**
 * Azure Database for PostgreSQL Flexible Server minimum TLS 1.2 → TLS / HTTPS.
 *
 * The direct sibling of the MySQL Flexible Server check, for the PostgreSQL
 * resource type (Microsoft.DBforPostgreSQL/flexibleServers). Without it, a
 * customer running only PostgreSQL Flexible Server gets 0 servers found by the
 * Azure SQL check → "0 passed" for the TLS task (the reported bug class).
 */
export const postgresqlFlexibleTlsCheck: IntegrationCheck = {
  id: 'azure-postgresql-flexible-tls',
  name: 'Database for PostgreSQL — TLS 1.2 enforced',
  description:
    'Verify Azure Database for PostgreSQL Flexible Servers require secure transport and a minimum TLS version of 1.2.',
  service: 'postgresql-flexible',
  taskMapping: TASK_TEMPLATES.tlsHttps,
  run: async (ctx: CheckContext) => {
    const sub = await resolveAzureSubscriptionId(ctx);
    if (!sub) return;
    const servers = await listPgFlexibleServers(ctx, sub);
    if (!servers) return;
    if (servers.length === 0) return;
    for (const s of servers) {
      // require_secure_transport is the primary TLS-enforcement gate and always
      // carries a value — a null read means we genuinely could not read it.
      const requireSecureTransport = await readConfigValue(
        ctx,
        s.id,
        'require_secure_transport',
      );
      if (requireSecureTransport === null) {
        ctx.fail({
          title: `Could not verify PostgreSQL TLS settings: ${s.name}`,
          description: `Unable to read the TLS server parameters for PostgreSQL flexible server "${s.name}", so TLS enforcement cannot be verified.`,
          resourceType: 'azure-postgresql-flexible-server',
          resourceId: s.id,
          severity: 'medium',
          remediation:
            'Grant read access to server configurations (Microsoft.DBforPostgreSQL/flexibleServers/configurations/read), then re-run the check.',
          evidence: { server: s.name },
        });
        continue;
      }

      // ssl_min_protocol_version may be unset (null) by default — that still
      // means a TLS 1.2 floor, so treat null as "" (compliant) rather than a
      // read failure.
      const sslMinProtocolVersion = await readConfigValue(
        ctx,
        s.id,
        'ssl_min_protocol_version',
      );
      const { compliant, issues } = evaluatePgTls(
        requireSecureTransport,
        sslMinProtocolVersion ?? '',
      );
      if (compliant) {
        ctx.pass({
          title: `TLS 1.2 enforced: ${s.name}`,
          description: `PostgreSQL flexible server "${s.name}" requires secure transport and a minimum TLS version of 1.2.`,
          resourceType: 'azure-postgresql-flexible-server',
          resourceId: s.id,
          evidence: {
            server: s.name,
            requireSecureTransport,
            sslMinProtocolVersion,
          },
        });
      } else {
        ctx.fail({
          title: `Outdated TLS configuration: ${s.name}`,
          description: `PostgreSQL flexible server "${s.name}": ${issues.join('; ')}.`,
          resourceType: 'azure-postgresql-flexible-server',
          resourceId: s.id,
          severity: 'medium',
          remediation:
            'Set require_secure_transport to ON and ssl_min_protocol_version to TLSv1.2 (or TLSv1.3).',
          evidence: {
            server: s.name,
            requireSecureTransport,
            sslMinProtocolVersion,
          },
        });
      }
    }
  },
};
