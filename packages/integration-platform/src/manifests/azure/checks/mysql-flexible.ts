import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { ARM_BASE, armListAllOrFail, resolveAzureSubscriptionId } from './shared';

// Pinned stable api-version for Azure Database for MySQL Flexible Server.
const MYSQL_API_VERSION = '2023-12-30';

interface MySqlFlexibleServer {
  id: string;
  name: string;
}

interface MySqlConfiguration {
  properties?: { value?: string };
}

// TLS enforcement on MySQL Flexible Server is controlled by SERVER PARAMETERS
// (configurations), not a top-level property like Azure SQL's `minimalTlsVersion`:
//   - require_secure_transport: ON/OFF  (forces SSL/TLS)
//   - tls_version: a comma-separated SET of enabled protocols (e.g. "TLSv1.2",
//     "TLSv1.2,TLSv1.3"). Compliant = secure transport ON and every enabled
//     version is 1.2+ (no TLSv1 / TLSv1.1).
const TLS_ALLOWED_VERSIONS = new Set(['TLSV1.2', 'TLSV1.3']);

/**
 * True when `tls_version` permits only TLS 1.2+ — i.e. every enabled protocol in
 * the comma-separated set is TLSv1.2 or TLSv1.3. An empty/unknown set is treated
 * as non-compliant (we can't assert a 1.2 floor). Comparison is case-insensitive.
 */
export function isMySqlTlsVersionCompliant(tlsVersion: string): boolean {
  const versions = tlsVersion
    .split(',')
    .map((v) => v.trim().toUpperCase())
    .filter((v) => v.length > 0);
  if (versions.length === 0) return false;
  return versions.every((v) => TLS_ALLOWED_VERSIONS.has(v));
}

/**
 * Pure evaluator: given the two server-parameter values, decide compliance and
 * collect human-readable issues. Kept separate from the ARM I/O so it can be
 * unit-tested directly.
 */
export function evaluateMySqlTls(
  requireSecureTransport: string,
  tlsVersion: string,
): { compliant: boolean; issues: string[] } {
  const issues: string[] = [];
  if (requireSecureTransport.trim().toUpperCase() !== 'ON') {
    issues.push('secure transport not required (require_secure_transport is OFF)');
  }
  if (!isMySqlTlsVersionCompliant(tlsVersion)) {
    issues.push(`minimum TLS allows versions below 1.2 (tls_version: ${tlsVersion})`);
  }
  return { compliant: issues.length === 0, issues };
}

async function listMySqlFlexibleServers(
  ctx: CheckContext,
  sub: string,
): Promise<MySqlFlexibleServer[] | null> {
  return armListAllOrFail<MySqlFlexibleServer>(
    ctx,
    `${ARM_BASE}/subscriptions/${sub}/providers/Microsoft.DBforMySQL/flexibleServers?api-version=${MYSQL_API_VERSION}`,
    {
      what: 'MySQL flexible servers',
      resourceType: 'azure-mysql-flexible-server',
      subscriptionId: sub,
    },
  );
}

/**
 * Read a single server configuration value. Returns null when the read fails
 * (permission/transient) or the value is absent, so the caller can emit an
 * explicit "could not verify" finding instead of a false pass.
 */
async function readConfigValue(
  ctx: CheckContext,
  serverId: string,
  name: string,
): Promise<string | null> {
  const res = await ctx
    .fetch<MySqlConfiguration>(
      `${ARM_BASE}${serverId}/configurations/${name}?api-version=${MYSQL_API_VERSION}`,
    )
    .catch(() => null);
  const value = res?.properties?.value;
  return typeof value === 'string' ? value : null;
}

/**
 * Azure Database for MySQL Flexible Server minimum TLS 1.2 → TLS / HTTPS.
 *
 * Mirrors the Azure SQL Database and Storage TLS checks, but targets the MySQL
 * Flexible Server resource type (Microsoft.DBforMySQL/flexibleServers), whose
 * TLS enforcement lives in server parameters rather than a top-level property.
 */
export const mysqlFlexibleTlsCheck: IntegrationCheck = {
  id: 'azure-mysql-flexible-tls',
  name: 'Database for MySQL — TLS 1.2 enforced',
  description:
    'Verify Azure Database for MySQL Flexible Servers require secure transport and a minimum TLS version of 1.2.',
  service: 'mysql-flexible',
  taskMapping: TASK_TEMPLATES.tlsHttps,
  run: async (ctx: CheckContext) => {
    const sub = await resolveAzureSubscriptionId(ctx);
    if (!sub) return;
    const servers = await listMySqlFlexibleServers(ctx, sub);
    if (!servers) return;
    if (servers.length === 0) return;
    for (const s of servers) {
      const requireSecureTransport = await readConfigValue(
        ctx,
        s.id,
        'require_secure_transport',
      );
      const tlsVersion = await readConfigValue(ctx, s.id, 'tls_version');

      if (requireSecureTransport === null || tlsVersion === null) {
        // Couldn't read the TLS parameters — fail explicitly so the TLS task
        // isn't falsely satisfied by other servers/checks that read cleanly.
        ctx.fail({
          title: `Could not verify MySQL TLS settings: ${s.name}`,
          description: `Unable to read the TLS server parameters for MySQL flexible server "${s.name}", so TLS enforcement cannot be verified.`,
          resourceType: 'azure-mysql-flexible-server',
          resourceId: s.id,
          severity: 'medium',
          remediation:
            'Grant read access to server configurations (Microsoft.DBforMySQL/flexibleServers/configurations/read), then re-run the check.',
          evidence: { server: s.name, requireSecureTransport, tlsVersion },
        });
        continue;
      }

      const { compliant, issues } = evaluateMySqlTls(
        requireSecureTransport,
        tlsVersion,
      );
      if (compliant) {
        ctx.pass({
          title: `TLS 1.2 enforced: ${s.name}`,
          description: `MySQL flexible server "${s.name}" requires secure transport and a minimum TLS version of 1.2.`,
          resourceType: 'azure-mysql-flexible-server',
          resourceId: s.id,
          evidence: { server: s.name, requireSecureTransport, tlsVersion },
        });
      } else {
        ctx.fail({
          title: `Outdated TLS configuration: ${s.name}`,
          description: `MySQL flexible server "${s.name}": ${issues.join('; ')}.`,
          resourceType: 'azure-mysql-flexible-server',
          resourceId: s.id,
          severity: 'medium',
          remediation:
            'Set require_secure_transport to ON and tls_version to TLSv1.2 (or TLSv1.2,TLSv1.3).',
          evidence: { server: s.name, requireSecureTransport, tlsVersion },
        });
      }
    }
  },
};
