import { describe, expect, it } from 'bun:test';
import type {
  CheckContext,
  CheckVariableValues,
  IntegrationCheck,
} from '../../../../types';
import { azureManifest } from '../../index';
import { rbacLeastPrivilegeCheck } from '../entra-id';
import { environmentSeparationCheck } from '../environment-separation';
import { keyVaultProtectionCheck, keyVaultRbacCheck } from '../key-vault';
import { monitorLoggingAlertingCheck } from '../monitor';
import {
  evaluateMySqlTls,
  isMySqlTlsVersionCompliant,
  mysqlFlexibleTlsCheck,
} from '../mysql-flexible';
import { nsgNoOpenPortsCheck } from '../network';
import {
  evaluatePgTls,
  isPgTlsVersionCompliant,
  postgresqlFlexibleTlsCheck,
} from '../postgresql-flexible';
import { sqlAuditingCheck, sqlPublicAccessCheck, sqlTlsCheck } from '../sql';
import {
  storageEncryptionCheck,
  storageHttpsTlsCheck,
  storagePublicAccessCheck,
} from '../storage';

interface Captured {
  passed: string[];
  failed: Array<{
    title: string;
    severity: string;
    remediation?: string;
    evidence?: Record<string, unknown>;
  }>;
}

async function run(
  check: IntegrationCheck,
  fetchFn: (url: string) => unknown,
  variables: CheckVariableValues = { subscription_id: 'sub-1' },
): Promise<Captured> {
  const passed: string[] = [];
  const failed: Captured['failed'] = [];
  const ctx = {
    accessToken: 'tok',
    credentials: {},
    variables,
    connectionId: 'c',
    organizationId: 'o',
    metadata: {},
    log: () => {},
    warn: () => {},
    error: () => {},
    pass: (r) => passed.push(r.title),
    fail: (r) =>
      failed.push({
        title: r.title,
        severity: r.severity,
        remediation: r.remediation,
        evidence: r.evidence,
      }),
    fetch: (async <T,>(url: string): Promise<T> => fetchFn(url) as T) as CheckContext['fetch'],
    post: (async () => ({})) as CheckContext['post'],
    put: (async () => ({})) as CheckContext['put'],
    patch: (async () => ({})) as CheckContext['patch'],
    delete: (async () => ({})) as CheckContext['delete'],
    graphql: (async () => ({})) as CheckContext['graphql'],
    fetchAllPages: (async () => []) as CheckContext['fetchAllPages'],
    fetchWithCursor: (async () => []) as CheckContext['fetchWithCursor'],
    fetchWithLinkHeader: (async () => []) as CheckContext['fetchWithLinkHeader'],
    getState: (async () => null) as CheckContext['getState'],
    setState: (async () => {}) as CheckContext['setState'],
  } as CheckContext;
  await check.run(ctx);
  return { passed, failed };
}

const storageList = (props: Record<string, unknown>) => () => ({
  value: [{ id: 'sa1', name: 'sa1', properties: props }],
});

describe('Azure storage checks', () => {
  it('https-tls fails when HTTPS off, passes when enforced', async () => {
    const bad = await run(
      storageHttpsTlsCheck,
      storageList({ supportsHttpsTrafficOnly: false, minimumTlsVersion: 'TLS1_2' }),
    );
    expect(bad.failed).toHaveLength(1);
    expect(bad.failed[0]!.severity).toBe('high');

    const ok = await run(
      storageHttpsTlsCheck,
      storageList({ supportsHttpsTrafficOnly: true, minimumTlsVersion: 'TLS1_2' }),
    );
    expect(ok.passed).toHaveLength(1);
  });

  it('public-access fails on public blob, passes when private', async () => {
    const bad = await run(storagePublicAccessCheck, storageList({ allowBlobPublicAccess: true }));
    expect(bad.failed).toHaveLength(1);

    const ok = await run(
      storagePublicAccessCheck,
      storageList({ allowBlobPublicAccess: false, publicNetworkAccess: 'Disabled' }),
    );
    expect(ok.passed).toHaveLength(1);
  });

  it("public-access: publicNetworkAccess 'Disabled' overrides networkAcls Allow", async () => {
    const { passed, failed } = await run(
      storagePublicAccessCheck,
      storageList({
        allowBlobPublicAccess: false,
        publicNetworkAccess: 'Disabled',
        networkAcls: { defaultAction: 'Allow' },
      }),
    );
    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
  });

  it("public-access: 'Selected networks' (publicNetworkAccess Enabled + defaultAction Deny) passes", async () => {
    const { passed, failed } = await run(
      storagePublicAccessCheck,
      storageList({
        allowBlobPublicAccess: false,
        publicNetworkAccess: 'Enabled',
        networkAcls: {
          defaultAction: 'Deny',
          bypass: 'AzureServices',
          ipRules: [{ value: '203.0.113.0/24', action: 'Allow' }],
        },
      }),
    );
    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
  });

  it('public-access: publicNetworkAccess Enabled with default Allow fails', async () => {
    const { passed, failed } = await run(
      storagePublicAccessCheck,
      storageList({
        allowBlobPublicAccess: false,
        publicNetworkAccess: 'Enabled',
        networkAcls: { defaultAction: 'Allow' },
      }),
    );
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.severity).toBe('medium');
  });

  it('encryption fails when a service is disabled, passes when enabled', async () => {
    const bad = await run(
      storageEncryptionCheck,
      storageList({ encryption: { services: { blob: { enabled: false }, file: { enabled: true } } } }),
    );
    expect(bad.failed).toHaveLength(1);

    const ok = await run(
      storageEncryptionCheck,
      storageList({ encryption: { services: { blob: { enabled: true }, file: { enabled: true } } } }),
    );
    expect(ok.passed).toHaveLength(1);
  });
});

describe('Azure SQL checks', () => {
  const server = { id: '/subscriptions/sub-1/srv1', name: 'srv1', properties: {} as Record<string, unknown> };

  it('tls fails below 1.2 and on None, passes at 1.2', async () => {
    const bad = await run(sqlTlsCheck, () => ({ value: [{ ...server, properties: { minimalTlsVersion: '1.0' } }] }));
    expect(bad.failed).toHaveLength(1);
    // 'None' is lexically > '1.2' but means no TLS floor → must fail
    const none = await run(sqlTlsCheck, () => ({ value: [{ ...server, properties: { minimalTlsVersion: 'None' } }] }));
    expect(none.failed).toHaveLength(1);
    const ok = await run(sqlTlsCheck, () => ({ value: [{ ...server, properties: { minimalTlsVersion: '1.2' } }] }));
    expect(ok.passed).toHaveLength(1);
  });

  it('public-access flags wide-open firewall as critical', async () => {
    const { failed } = await run(sqlPublicAccessCheck, (url) =>
      url.includes('/firewallRules')
        ? { value: [{ properties: { startIpAddress: '0.0.0.0', endIpAddress: '255.255.255.255' } }] }
        : { value: [{ ...server, properties: { publicNetworkAccess: 'Disabled' } }] },
    );
    expect(failed).toHaveLength(1);
    expect(failed[0]!.severity).toBe('critical');
  });

  it('public-access passes when private + no wide-open rule', async () => {
    const { passed } = await run(sqlPublicAccessCheck, (url) =>
      url.includes('/firewallRules')
        ? { value: [] }
        : { value: [{ ...server, properties: { publicNetworkAccess: 'Disabled' } }] },
    );
    expect(passed).toHaveLength(1);
  });

  it('public-access fails closed (medium) when firewall rules cannot be read', async () => {
    // A firewall read failure must NOT be coerced to "no public rules" (a false
    // pass that hides exposure) — it must emit a "could not verify" finding.
    const { passed, failed } = await run(sqlPublicAccessCheck, (url) => {
      if (url.includes('/firewallRules')) throw new Error('403');
      return { value: [{ ...server, properties: { publicNetworkAccess: 'Disabled' } }] };
    });
    expect(passed).toHaveLength(0);
    expect(
      failed.some(
        (f) => /Could not read SQL firewall/.test(f.title) && f.severity === 'medium',
      ),
    ).toBe(true);
  });

  it('auditing fails when disabled, passes when enabled', async () => {
    const bad = await run(sqlAuditingCheck, (url) =>
      url.includes('/auditingSettings/default')
        ? { properties: { state: 'Disabled' } }
        : { value: [server] },
    );
    expect(bad.failed).toHaveLength(1);
    const ok = await run(sqlAuditingCheck, (url) =>
      url.includes('/auditingSettings/default')
        ? { properties: { state: 'Enabled' } }
        : { value: [server] },
    );
    expect(ok.passed).toHaveLength(1);
  });
});

describe('Azure Key Vault checks', () => {
  const vaultList = (props: Record<string, unknown>) => () => ({
    value: [{ id: 'kv1', name: 'kv1', properties: props }],
  });

  it('protection fails when soft delete off, passes when hardened', async () => {
    const bad = await run(keyVaultProtectionCheck, vaultList({ enableSoftDelete: false, enablePurgeProtection: true, publicNetworkAccess: 'Disabled' }));
    expect(bad.failed).toHaveLength(1);
    expect(bad.failed[0]!.severity).toBe('high');

    const ok = await run(keyVaultProtectionCheck, vaultList({ enableSoftDelete: true, enablePurgeProtection: true, publicNetworkAccess: 'Disabled' }));
    expect(ok.passed).toHaveLength(1);
  });

  it('rbac fails on legacy access policies, passes when RBAC on', async () => {
    const bad = await run(keyVaultRbacCheck, vaultList({ enableRbacAuthorization: false }));
    expect(bad.failed[0]!.severity).toBe('low');
    const ok = await run(keyVaultRbacCheck, vaultList({ enableRbacAuthorization: true }));
    expect(ok.passed).toHaveLength(1);
  });
});

describe('Azure NSG check', () => {
  const nsg = (rule: Record<string, unknown>) => () => ({
    value: [{ id: 'nsg1', name: 'nsg1', properties: { securityRules: [rule] } }],
  });

  it('flags RDP open to internet as critical', async () => {
    const { failed } = await run(
      nsgNoOpenPortsCheck,
      nsg({ name: 'r1', properties: { direction: 'Inbound', access: 'Allow', protocol: 'Tcp', sourceAddressPrefix: '*', destinationPortRange: '3389', priority: 100 } }),
    );
    expect(failed.some((f) => f.severity === 'critical')).toBe(true);
  });

  it('passes when no internet-open sensitive ports', async () => {
    const { passed } = await run(
      nsgNoOpenPortsCheck,
      nsg({ name: 'r1', properties: { direction: 'Inbound', access: 'Allow', protocol: 'Tcp', sourceAddressPrefix: '10.0.0.0/8', destinationPortRange: '22', priority: 100 } }),
    );
    expect(passed).toHaveLength(1);
  });

  it('flags IPv6 ::/0 source and port ranges covering sensitive ports', async () => {
    const ipv6 = await run(
      nsgNoOpenPortsCheck,
      nsg({ name: 'r6', properties: { direction: 'Inbound', access: 'Allow', protocol: 'Tcp', sourceAddressPrefix: '::/0', destinationPortRange: '3389', priority: 100 } }),
    );
    expect(ipv6.failed.some((f) => f.severity === 'critical')).toBe(true);

    const range = await run(
      nsgNoOpenPortsCheck,
      nsg({ name: 'rr', properties: { direction: 'Inbound', access: 'Allow', protocol: 'Tcp', sourceAddressPrefix: '*', destinationPortRange: '20-30', priority: 100 } }),
    );
    expect(range.failed.some((f) => f.title.match(/SSH/))).toBe(true);
  });

  it('treats an explicit all-ports range (0-65535) as wide open', async () => {
    const { failed } = await run(
      nsgNoOpenPortsCheck,
      nsg({ name: 'rall', properties: { direction: 'Inbound', access: 'Allow', protocol: 'Tcp', sourceAddressPrefix: '*', destinationPortRange: '0-65535', priority: 100 } }),
    );
    // covers SSH + RDP just like '*'
    expect(failed.some((f) => f.severity === 'critical')).toBe(true);
  });

  it('does not flag a UDP rule on a TCP-only sensitive port', async () => {
    const { passed, failed } = await run(
      nsgNoOpenPortsCheck,
      nsg({ name: 'rudp', properties: { direction: 'Inbound', access: 'Allow', protocol: 'Udp', sourceAddressPrefix: '*', destinationPortRange: '22', priority: 100 } }),
    );
    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
  });
});

describe('Azure RBAC (entra) check', () => {
  it('fails on >5 privileged assignments', async () => {
    const { failed } = await run(rbacLeastPrivilegeCheck, (url) => {
      if (url.includes('roleDefinitions')) {
        return { value: [{ id: 'owner', properties: { roleName: 'Owner', type: 'BuiltInRole', permissions: [] } }] };
      }
      return {
        value: Array.from({ length: 6 }, () => ({
          properties: { roleDefinitionId: 'owner', principalId: 'p', principalType: 'User' },
        })),
      };
    });
    expect(failed.some((f) => f.title.match(/Excessive privileged/))).toBe(true);
  });

  it('flags a custom role with wildcard dataActions', async () => {
    const { failed } = await run(rbacLeastPrivilegeCheck, (url) => {
      if (url.includes('roleDefinitions')) {
        return {
          value: [
            { id: 'cr', properties: { roleName: 'Custom', type: 'CustomRole', permissions: [{ actions: [], dataActions: ['*'] }] } },
          ],
        };
      }
      return { value: [] };
    });
    expect(failed.some((f) => f.title.match(/[Ww]ildcard/))).toBe(true);
  });

  it('passes with few privileged, no wildcard roles', async () => {
    const { passed } = await run(rbacLeastPrivilegeCheck, (url) => {
      if (url.includes('roleDefinitions')) {
        return { value: [{ id: 'reader', properties: { roleName: 'Reader', type: 'BuiltInRole', permissions: [] } }] };
      }
      return { value: [{ properties: { roleDefinitionId: 'reader', principalId: 'p', principalType: 'User' } }] };
    });
    expect(passed).toHaveLength(1);
  });

  it('flags a wildcard custom role assigned from a management-group scope (resolved out-of-scope)', async () => {
    // The role lives at an MG scope, so it is NOT in the subscription-scope
    // roleDefinitions list — it's only resolved because an assignment references
    // it. Its wildcard is a mid-path action (not high-privilege), so it is caught
    // ONLY by the wildcard scan, which must include resolved out-of-scope defs.
    const mgRoleId =
      '/providers/Microsoft.Management/managementGroups/mg1/providers/Microsoft.Authorization/roleDefinitions/role-guid';
    const { failed } = await run(rbacLeastPrivilegeCheck, (url) => {
      if (url.includes('/managementGroups/')) {
        return {
          id: mgRoleId,
          properties: {
            roleName: 'MG Wildcard',
            type: 'CustomRole',
            permissions: [{ actions: ['Microsoft.Network/*/read'], dataActions: [] }],
          },
        };
      }
      if (url.includes('roleDefinitions')) return { value: [] };
      return {
        value: [{ properties: { roleDefinitionId: mgRoleId, principalId: 'p', principalType: 'User' } }],
      };
    });
    expect(failed.some((f) => /Custom role with wildcard/.test(f.title))).toBe(true);
  });
});

describe('Azure Monitor check', () => {
  it('fails when no alerts and no log export', async () => {
    const { failed } = await run(monitorLoggingAlertingCheck, () => ({ value: [] }));
    // missing alerts + no diagnostic export
    expect(failed).toHaveLength(2);
  });
});

describe('Azure ARM pagination safety', () => {
  it('does not follow an off-host nextLink (no bearer token leaks to a foreign host)', async () => {
    // A nextLink whose host is not management.azure.com must be rejected before
    // the next fetch, else the OAuth bearer token would be sent to it. The
    // classic prefix bypass "https://management.azure.com.evil.com/..." must NOT
    // be treated as on-host.
    const fetched: string[] = [];
    await run(storageHttpsTlsCheck, (url) => {
      fetched.push(url);
      if (url.includes('/storageAccounts') && !url.includes('evil')) {
        return {
          value: [
            {
              id: 'sa1',
              name: 'sa1',
              properties: { supportsHttpsTrafficOnly: true, minimumTlsVersion: 'TLS1_2' },
            },
          ],
          nextLink: 'https://management.azure.com.evil.com/next?api-version=2023-01-01',
        };
      }
      return { value: [] };
    });
    expect(fetched.some((u) => u.includes('evil'))).toBe(false);
  });
});

// ── MySQL Flexible Server TLS ──────────────────────────────────────────────

// Mock fetch for the MySQL TLS check: returns the server list for the
// flexibleServers list call, and the two configuration GETs (passing null to
// simulate a config read failure).
function mysqlFetch(
  requireSecureTransport: string | null,
  tlsVersion: string | null,
  servers: Array<{ id: string; name: string }> = [
    {
      id: '/subscriptions/sub-1/resourceGroups/rg/providers/Microsoft.DBforMySQL/flexibleServers/db1',
      name: 'db1',
    },
  ],
) {
  return (url: string) => {
    if (url.includes('/configurations/require_secure_transport')) {
      if (requireSecureTransport === null) throw new Error('HTTP 403');
      return { properties: { value: requireSecureTransport } };
    }
    if (url.includes('/configurations/tls_version')) {
      if (tlsVersion === null) throw new Error('HTTP 403');
      return { properties: { value: tlsVersion } };
    }
    if (url.includes('/flexibleServers?')) {
      return { value: servers };
    }
    return {};
  };
}

describe('isMySqlTlsVersionCompliant', () => {
  it('accepts only TLS 1.2+ (single or comma-separated set), case-insensitive', () => {
    expect(isMySqlTlsVersionCompliant('TLSv1.2')).toBe(true);
    expect(isMySqlTlsVersionCompliant('TLSv1.2,TLSv1.3')).toBe(true);
    expect(isMySqlTlsVersionCompliant('tlsv1.3')).toBe(true);
  });

  it('rejects any set that enables TLS 1.0/1.1, or is empty/unknown', () => {
    expect(isMySqlTlsVersionCompliant('TLSv1.1,TLSv1.2')).toBe(false);
    expect(isMySqlTlsVersionCompliant('TLSv1')).toBe(false);
    expect(isMySqlTlsVersionCompliant('')).toBe(false);
    expect(isMySqlTlsVersionCompliant('TLSv1.2,Foo')).toBe(false);
  });
});

describe('evaluateMySqlTls', () => {
  it('is compliant only when secure transport is ON and TLS floor is 1.2+', () => {
    expect(evaluateMySqlTls('ON', 'TLSv1.2').compliant).toBe(true);
    expect(evaluateMySqlTls('on', 'TLSv1.2,TLSv1.3').compliant).toBe(true);
    expect(evaluateMySqlTls('OFF', 'TLSv1.2').compliant).toBe(false);
    expect(evaluateMySqlTls('ON', 'TLSv1.1,TLSv1.2').compliant).toBe(false);
  });
});

describe('Azure MySQL Flexible Server TLS check', () => {
  it('passes when secure transport is ON and TLS >= 1.2', async () => {
    const { passed, failed } = await run(mysqlFlexibleTlsCheck, mysqlFetch('ON', 'TLSv1.2'));
    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
  });

  it('passes with the comma-separated TLSv1.2,TLSv1.3 set', async () => {
    const { passed, failed } = await run(
      mysqlFlexibleTlsCheck,
      mysqlFetch('ON', 'TLSv1.2,TLSv1.3'),
    );
    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
  });

  it('fails when secure transport is OFF', async () => {
    const { passed, failed } = await run(mysqlFlexibleTlsCheck, mysqlFetch('OFF', 'TLSv1.2'));
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.severity).toBe('medium');
  });

  it('fails when TLS 1.1 is still enabled', async () => {
    const { passed, failed } = await run(
      mysqlFlexibleTlsCheck,
      mysqlFetch('ON', 'TLSv1.1,TLSv1.2'),
    );
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
  });

  it('emits "could not verify" when a config read fails (no false pass)', async () => {
    const { passed, failed } = await run(mysqlFlexibleTlsCheck, mysqlFetch(null, 'TLSv1.2'));
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.title).toMatch(/Could not verify/);
  });

  it('no-ops when there are no MySQL flexible servers (0 passed, 0 failed)', async () => {
    const { passed, failed } = await run(
      mysqlFlexibleTlsCheck,
      mysqlFetch('ON', 'TLSv1.2', []),
    );
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(0);
  });
});

// ── PostgreSQL Flexible Server TLS ─────────────────────────────────────────

// Mock fetch for the PostgreSQL TLS check. Pass null for a config to simulate a
// read failure; pass '' for ssl to simulate an unset floor.
function pgFetch(
  requireSecureTransport: string | null,
  sslMinProtocolVersion: string | null,
  servers: Array<{ id: string; name: string }> = [
    {
      id: '/subscriptions/sub-1/resourceGroups/rg/providers/Microsoft.DBforPostgreSQL/flexibleServers/pg1',
      name: 'pg1',
    },
  ],
) {
  return (url: string) => {
    if (url.includes('/configurations/require_secure_transport')) {
      if (requireSecureTransport === null) throw new Error('HTTP 403');
      return { properties: { value: requireSecureTransport } };
    }
    if (url.includes('/configurations/ssl_min_protocol_version')) {
      if (sslMinProtocolVersion === null) return {}; // unset → no value field
      return { properties: { value: sslMinProtocolVersion } };
    }
    if (url.includes('/flexibleServers?')) {
      return { value: servers };
    }
    return {};
  };
}

describe('isPgTlsVersionCompliant', () => {
  it('accepts TLSv1.2 / TLSv1.3 and treats unset as compliant (platform floor is 1.2)', () => {
    expect(isPgTlsVersionCompliant('TLSv1.2')).toBe(true);
    expect(isPgTlsVersionCompliant('TLSv1.3')).toBe(true);
    expect(isPgTlsVersionCompliant('')).toBe(true);
  });

  it('rejects an explicit sub-1.2 floor', () => {
    expect(isPgTlsVersionCompliant('TLSv1.1')).toBe(false);
    expect(isPgTlsVersionCompliant('TLSv1')).toBe(false);
  });
});

describe('evaluatePgTls', () => {
  it('is compliant when secure transport is ON (with set or unset SSL floor)', () => {
    expect(evaluatePgTls('ON', 'TLSv1.2').compliant).toBe(true);
    expect(evaluatePgTls('ON', '').compliant).toBe(true);
    expect(evaluatePgTls('OFF', 'TLSv1.2').compliant).toBe(false);
  });
});

describe('Azure PostgreSQL Flexible Server TLS check', () => {
  it('passes when secure transport is ON and SSL floor is 1.2', async () => {
    const { passed, failed } = await run(postgresqlFlexibleTlsCheck, pgFetch('ON', 'TLSv1.2'));
    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
  });

  it('passes when secure transport is ON and ssl_min_protocol_version is unset', async () => {
    const { passed, failed } = await run(postgresqlFlexibleTlsCheck, pgFetch('ON', null));
    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
  });

  it('fails when secure transport is OFF', async () => {
    const { passed, failed } = await run(postgresqlFlexibleTlsCheck, pgFetch('OFF', 'TLSv1.2'));
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
  });

  it('emits "could not verify" when require_secure_transport cannot be read', async () => {
    const { passed, failed } = await run(postgresqlFlexibleTlsCheck, pgFetch(null, 'TLSv1.2'));
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.title).toMatch(/Could not verify/);
  });

  it('emits "could not verify" when the ssl_min_protocol_version READ fails (not a silent pass)', async () => {
    // Regression for the cubic finding: a thrown ssl read (permission/transient)
    // must NOT be coalesced into a compliant result. Distinct from an unset
    // value, which reads back as "" on a successful response (compliant floor).
    const { passed, failed } = await run(postgresqlFlexibleTlsCheck, (url: string) => {
      if (url.includes('/configurations/require_secure_transport')) {
        return { properties: { value: 'ON' } };
      }
      if (url.includes('/configurations/ssl_min_protocol_version')) {
        throw new Error('HTTP 403');
      }
      if (url.includes('/flexibleServers?')) {
        return {
          value: [
            {
              id: '/subscriptions/sub-1/resourceGroups/rg/providers/Microsoft.DBforPostgreSQL/flexibleServers/pg1',
              name: 'pg1',
            },
          ],
        };
      }
      return {};
    });
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.title).toMatch(/Could not verify/);
  });

  it('no-ops when there are no PostgreSQL flexible servers', async () => {
    const { passed, failed } = await run(postgresqlFlexibleTlsCheck, pgFetch('ON', 'TLSv1.2', []));
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(0);
  });
});

describe('Azure read-failure remediation gating', () => {
  const httpError = (status: number, message: string) => {
    const err = new Error(message);
    (err as Error & { status: number }).status = status;
    return err;
  };
  const SERVER = {
    id: '/subscriptions/sub-1/resourceGroups/rg/providers/Microsoft.Sql/servers/s1',
    name: 's1',
    properties: {},
  };

  it('sql auditing: transient read says re-run; denied keeps the grant hint', async () => {
    const transient = await run(sqlAuditingCheck, (url: string) => {
      if (url.includes('/providers/Microsoft.Sql/servers?')) return { value: [SERVER] };
      if (url.includes('/auditingSettings/')) throw httpError(500, 'HTTP 500: Internal Server Error');
      return {};
    });
    const f = transient.failed.find((x) => x.title.includes('Could not read SQL auditing settings'));
    expect(f).toBeDefined();
    expect(f!.remediation).toMatch(/re-run/i);
    expect(f!.remediation).not.toContain('auditingSettings/read');
    expect(f!.evidence).toMatchObject({ readError: 'HTTP 500: Internal Server Error' });

    const denied = await run(sqlAuditingCheck, (url: string) => {
      if (url.includes('/providers/Microsoft.Sql/servers?')) return { value: [SERVER] };
      if (url.includes('/auditingSettings/')) throw httpError(403, 'HTTP 403: Forbidden - AuthorizationFailed');
      return {};
    });
    const fd = denied.failed.find((x) => x.title.includes('Could not read SQL auditing settings'));
    expect(fd).toBeDefined();
    expect(fd!.remediation).toContain('Microsoft.Sql/servers/auditingSettings/read');
    expect(fd!.evidence).toMatchObject({ readError: 'HTTP 403: Forbidden - AuthorizationFailed' });
  });

  it('monitor: unreadable alerts carry readError and a gated (transient) remediation', async () => {
    const out = await run(monitorLoggingAlertingCheck, (url: string) => {
      if (url.includes('activityLogAlerts')) throw httpError(500, 'HTTP 500: boom');
      if (url.includes('diagnosticSettings')) return { value: [] };
      return {};
    });
    const f = out.failed.find((x) => x.title === 'Could not read activity log alerts');
    expect(f).toBeDefined();
    expect(f!.remediation).toMatch(/re-run/i);
    expect(f!.remediation).not.toContain('Monitoring Reader');
    expect(f!.evidence).toMatchObject({ readError: 'HTTP 500: boom' });
  });
});

describe('Azure multi-subscription scanning', () => {
  const SUBS = {
    value: [
      { subscriptionId: 'sub-a', state: 'Enabled', displayName: 'A' },
      { subscriptionId: 'sub-b', state: 'Enabled', displayName: 'B' },
      { subscriptionId: 'sub-old', state: 'Disabled', displayName: 'Old' },
    ],
  };
  const serverIn = (sub: string) => ({
    value: [
      {
        id: `/subscriptions/${sub}/resourceGroups/rg/providers/Microsoft.Sql/servers/s-${sub}`,
        name: `s-${sub}`,
        properties: { minimalTlsVersion: '1.2' },
      },
    ],
  });

  it('without a selection, keeps the pre-picker single-subscription behavior (first Enabled)', async () => {
    const seen: string[] = [];
    const out = await run(
      sqlTlsCheck,
      (url: string) => {
        if (url.includes('/subscriptions?api-version')) return SUBS;
        const m = url.match(/subscriptions\/(sub-\w+)\/providers\/Microsoft.Sql\/servers\?/);
        if (m) {
          seen.push(m[1]!);
          return serverIn(m[1]!);
        }
        return {};
      },
      {},
    );
    // scope expansion is strictly opt-in: only the first Enabled sub is scanned
    expect(seen).toEqual(['sub-a']);
    expect(out.passed).toHaveLength(1);
    expect(out.failed).toHaveLength(0);
  });

  it('scans multiple subscriptions ONLY when explicitly selected', async () => {
    const seen: string[] = [];
    const out = await run(
      sqlTlsCheck,
      (url: string) => {
        const m = url.match(/subscriptions\/(sub-\w+)\/providers\/Microsoft.Sql\/servers\?/);
        if (m) {
          seen.push(m[1]!);
          return serverIn(m[1]!);
        }
        return {};
      },
      { subscription_ids: ['sub-a', 'sub-b'] },
    );
    expect(seen).toEqual(['sub-a', 'sub-b']);
    expect(out.passed).toHaveLength(2);
  });

  it('scopes to the selected subscription_ids when set', async () => {
    const seen: string[] = [];
    const out = await run(
      sqlTlsCheck,
      (url: string) => {
        const m = url.match(/subscriptions\/(sub-\w+)\/providers\/Microsoft.Sql\/servers\?/);
        if (m) {
          seen.push(m[1]!);
          return serverIn(m[1]!);
        }
        return {};
      },
      { subscription_ids: ['sub-b'] },
    );
    expect(seen).toEqual(['sub-b']);
    expect(out.passed).toHaveLength(1);
  });

  it('a saved subscription_id keeps exactly its previous scope (no list call needed)', async () => {
    const seen: string[] = [];
    const out = await run(
      sqlTlsCheck,
      (url: string) => {
        if (url.includes('/subscriptions?api-version')) {
          throw new Error('must not list subscriptions when legacy value is set');
        }
        const m = url.match(/subscriptions\/(sub-\w+)\/providers\/Microsoft.Sql\/servers\?/);
        if (m) {
          seen.push(m[1]!);
          return serverIn(m[1]!);
        }
        return {};
      },
      { subscription_id: 'sub-legacy' },
    );
    expect(seen).toEqual(['sub-legacy']);
    expect(out.passed).toHaveLength(1);
    expect(out.failed).toHaveLength(0);
  });

  it('emits an explicit scope finding when nothing is visible and no legacy value exists', async () => {
    const out = await run(
      sqlTlsCheck,
      (url: string) => {
        if (url.includes('/subscriptions?api-version')) return { value: [] };
        return {};
      },
      {},
    );
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/Could not verify Azure subscription scope/);
  });
});

describe('Azure subscription cap', () => {
  it('selecting more than the limit scans the first 50 AND emits an explicit coverage finding', async () => {
    const selected = Array.from({ length: 53 }, (_, i) => `sub-${i}`);
    const seen = new Set<string>();
    const out = await run(
      sqlTlsCheck,
      (url: string) => {
        const m = url.match(/subscriptions\/(sub-\d+)\/providers\/Microsoft.Sql\/servers\?/);
        if (m) {
          seen.add(m[1]!);
          return { value: [] };
        }
        return {};
      },
      { subscription_ids: selected },
    );
    expect(seen.size).toBe(50);
    const capFinding = out.failed.find((f) => f.title.includes('exceeds the scan limit'));
    expect(capFinding).toBeDefined();
    expect(capFinding!.evidence).toMatchObject({
      selected: 53,
      scanned: 50,
      unscannedSubscriptionIds: ['sub-50', 'sub-51', 'sub-52'],
    });
  });
});

describe('entra-id multi-subscription wildcard isolation (cubic finding on #3090)', () => {
  it('an MG wildcard role referenced only by one subscription is reported exactly once', async () => {
    const MG_DEF_ID = '/providers/Microsoft.Management/managementGroups/mg1/providers/Microsoft.Authorization/roleDefinitions/wild';
    let mgDefFetches = 0;
    const { failed } = await run(
      rbacLeastPrivilegeCheck,
      (url: string) => {
        if (url.startsWith(MG_DEF_ID)) {
          mgDefFetches++;
          return {
            id: MG_DEF_ID,
            properties: {
              roleName: 'MG Wildcard',
              type: 'CustomRole',
              permissions: [{ actions: ['*'], dataActions: [] }],
            },
          };
        }
        if (url.includes('roleDefinitions')) {
          return { value: [{ id: 'reader', properties: { roleName: 'Reader', type: 'BuiltInRole', permissions: [] } }] };
        }
        if (url.includes('roleAssignments')) {
          // only sub-a has an assignment referencing the MG wildcard role
          return url.includes('sub-a')
            ? { value: [{ properties: { roleDefinitionId: MG_DEF_ID, principalId: 'p1', principalType: 'User' } }] }
            : { value: [] };
        }
        return { value: [] };
      },
      { subscription_ids: ['sub-a', 'sub-b'] },
    );
    const wildcardFindings = failed.filter((f) => f.title.match(/[Ww]ildcard/));
    expect(wildcardFindings).toHaveLength(1);
    // the shared cache still prevents refetching across subscriptions
    expect(mgDefFetches).toBe(1);
  });
});

describe('azure subscription picker fetchOptions', () => {
  it('follows nextLink so every subscription page is selectable', async () => {
    const variable = azureManifest.variables?.find((v) => v.id === 'subscription_ids');
    const ctx = {
      fetch: async (url: string) => {
        if (url.includes('skiptoken')) {
          return { value: [{ subscriptionId: 'sub-2', displayName: 'B', state: 'Enabled' }] };
        }
        return {
          value: [{ subscriptionId: 'sub-1', displayName: 'A', state: 'Enabled' }],
          nextLink: 'https://management.azure.com/subscriptions?api-version=2020-01-01&skiptoken=x',
        };
      },
    } as unknown as Parameters<NonNullable<typeof variable.fetchOptions>>[0];
    const options = await variable!.fetchOptions!(ctx);
    expect(options.map((o) => o.value)).toEqual(['sub-1', 'sub-2']);
  });

  it('does not follow a nextLink that leaves the ARM host', async () => {
    const variable = azureManifest.variables?.find((v) => v.id === 'subscription_ids');
    const fetched: string[] = [];
    const ctx = {
      fetch: async (url: string) => {
        fetched.push(url);
        return {
          value: [{ subscriptionId: 'sub-1', displayName: 'A', state: 'Enabled' }],
          nextLink: 'https://evil.example.com/subscriptions',
        };
      },
    } as unknown as Parameters<NonNullable<typeof variable.fetchOptions>>[0];
    const options = await variable!.fetchOptions!(ctx);
    expect(fetched).toHaveLength(1);
    expect(options.map((o) => o.value)).toEqual(['sub-1']);
  });

  it('returns [] instead of throwing when subscriptions cannot be listed', async () => {
    const variable = azureManifest.variables?.find((v) => v.id === 'subscription_ids');
    expect(variable?.fetchOptions).toBeDefined();
    const ctx = {
      fetch: async () => {
        throw new Error('HTTP 403: Forbidden');
      },
    } as unknown as Parameters<NonNullable<typeof variable.fetchOptions>>[0];
    const options = await variable!.fetchOptions!(ctx);
    expect(options).toEqual([]);
  });

  it('exposes environment aliases as an Azure connection variable', () => {
    expect(azureManifest.variables?.some((v) => v.id === 'environment_aliases')).toBe(true);
  });
});

describe('Azure environment separation', () => {
  // Mocks the IN-SCOPE per-subscription name GET and the per-subscription
  // resource-group list. Scope is driven by the `variables` arg (subscription_id
  // / subscription_ids) via resolveAzureSubscriptionIds — there is NO list-all.
  const azFetch =
    (opts: { names?: Record<string, string>; rgs?: Record<string, unknown[]> }) =>
    (url: string) => {
      const subM = url.match(/\/subscriptions\/([^/?]+)\?api-version/);
      if (subM) return { displayName: opts.names?.[subM[1]!] ?? subM[1]! };
      const rgM = url.match(/\/subscriptions\/([^/]+)\/resourcegroups/);
      if (rgM) return { value: opts.rgs?.[rgM[1]!] ?? [] };
      return {};
    };

  it('passes (strong) when scoped subscriptions classify to prod + non-prod', async () => {
    const { passed, failed } = await run(
      environmentSeparationCheck,
      azFetch({ names: { s1: 'Production', s2: 'Development' } }),
      { subscription_ids: ['s1', 's2'] },
    );
    expect(failed).toHaveLength(0);
    expect(passed).toContain('Environments separated across subscriptions');
  });

  it('passes (weak) on resource-group separation, disclosed as logical', async () => {
    const { passed, failed } = await run(
      environmentSeparationCheck,
      azFetch({
        names: { 'sub-1': 'MyCompany' },
        rgs: { 'sub-1': [{ id: 'a', name: 'rg-prod' }, { id: 'b', name: 'rg-dev' }] },
      }),
    );
    expect(failed).toHaveLength(0);
    expect(passed).toContain('Environments separated across resource groups');
  });

  it('passes on resource-group tags (case-insensitive key)', async () => {
    const { passed } = await run(
      environmentSeparationCheck,
      azFetch({
        names: { 'sub-1': 'Company' },
        rgs: {
          'sub-1': [
            { id: 'a', name: 'a', tags: { environment: 'production' } },
            { id: 'b', name: 'b', tags: { Environment: 'staging' } },
          ],
        },
      }),
    );
    expect(passed).toContain('Environments separated across resource groups');
  });

  it('passes with customer-configured environment aliases', async () => {
    const { passed, failed } = await run(
      environmentSeparationCheck,
      azFetch({
        names: { 'sub-1': 'Company' },
        rgs: {
          'sub-1': [{ id: 'a', name: 'app-release' }, { id: 'b', name: 'app-preview' }],
        },
      }),
      {
        subscription_id: 'sub-1',
        environment_aliases: 'release=production, preview=staging',
      },
    );
    expect(failed).toHaveLength(0);
    expect(passed).toContain('Environments separated across resource groups');
  });

  it('fails on two non-production environments (no production)', async () => {
    const { passed, failed } = await run(
      environmentSeparationCheck,
      azFetch({
        names: { 'sub-1': 'Company' },
        rgs: { 'sub-1': [{ id: 'a', name: 'rg-dev' }, { id: 'b', name: 'rg-staging' }] },
      }),
    );
    expect(passed).toHaveLength(0);
    expect(failed.some((f) => /Could not confirm environment separation/.test(f.title))).toBe(true);
  });

  it('does NOT union tiers: prod subscription + an rg-dev inside fails', async () => {
    const { passed, failed } = await run(
      environmentSeparationCheck,
      azFetch({ names: { s1: 'Production' }, rgs: { s1: [{ id: 'a', name: 'rg-dev' }] } }),
      { subscription_ids: ['s1'] },
    );
    expect(passed).toHaveLength(0);
    expect(failed.some((f) => /Could not confirm environment separation/.test(f.title))).toBe(true);
  });

  it('only scans the configured subscription scope', async () => {
    // Scope is ['s1']; touching any other subscription must throw.
    const { passed, failed } = await run(
      environmentSeparationCheck,
      (url) => {
        if (!url.includes('/subscriptions/s1')) {
          throw new Error(`out-of-scope access: ${url}`);
        }
        const subM = url.match(/\/subscriptions\/([^/?]+)\?api-version/);
        if (subM) return { displayName: 'Company' };
        if (url.includes('/resourcegroups')) {
          return { value: [{ id: 'a', name: 'rg-prod' }, { id: 'b', name: 'rg-dev' }] };
        }
        return {};
      },
      { subscription_ids: ['s1'] },
    );
    expect(failed).toHaveLength(0);
    expect(passed).toContain('Environments separated across resource groups');
  });

  it('fails with guidance when nothing classifies', async () => {
    const { passed, failed } = await run(
      environmentSeparationCheck,
      azFetch({ names: { 'sub-1': 'Company' }, rgs: { 'sub-1': [{ id: 'a', name: 'backend' }] } }),
    );
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.remediation).toMatch(/distinct subscriptions/);
  });

  it('fails "could not verify" when a resource-group read fails', async () => {
    const { passed, failed } = await run(environmentSeparationCheck, (url) => {
      if (url.includes('/resourcegroups')) throw new Error('HTTP 403: Forbidden');
      const subM = url.match(/\/subscriptions\/([^/?]+)\?api-version/);
      if (subM) return { displayName: 'Company' };
      return {};
    });
    expect(passed).toHaveLength(0);
    expect(failed.some((f) => /Could not verify environment separation/.test(f.title))).toBe(true);
  });

  it('fails "could not verify" when a SUBSCRIPTION name read fails (cubic finding)', async () => {
    // Tier-1 displayName read fails while resource-group listing succeeds but
    // classifies nothing. Coverage is incomplete, so the verdict must be the
    // retry-signalling "could not verify", not the confident "could not confirm".
    const { passed, failed } = await run(
      environmentSeparationCheck,
      (url) => {
        const subM = url.match(/\/subscriptions\/([^/?]+)\?api-version/);
        if (subM) throw new Error('HTTP 403: Forbidden');
        if (url.includes('/resourcegroups')) {
          return { value: [{ id: 'a', name: 'backend' }] };
        }
        return {};
      },
      { subscription_ids: ['s1'] },
    );
    expect(passed).toHaveLength(0);
    expect(failed.some((f) => /Could not verify environment separation/.test(f.title))).toBe(true);
    expect(failed.some((f) => /Could not confirm environment separation/.test(f.title))).toBe(false);
  });

  it('defers to the scope resolver when no subscription is in scope', async () => {
    // variables {} → discovery; no enabled subscription → resolveAzureSubscriptionIds
    // emits its own scope finding and the check early-returns (no double fail).
    const { passed, failed } = await run(
      environmentSeparationCheck,
      (url) => {
        if (url.includes('/subscriptions?api-version')) {
          return { value: [{ subscriptionId: 's1', state: 'Disabled' }] };
        }
        return {};
      },
      {},
    );
    expect(passed).toHaveLength(0);
    expect(failed.some((f) => /Could not verify Azure subscription scope/.test(f.title))).toBe(true);
  });
});
