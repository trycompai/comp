import { describe, expect, it } from 'bun:test';
import type {
  CheckContext,
  CheckVariableValues,
  IntegrationCheck,
} from '../../../../types';
import { rbacLeastPrivilegeCheck } from '../entra-id';
import { keyVaultProtectionCheck, keyVaultRbacCheck } from '../key-vault';
import { monitorLoggingAlertingCheck } from '../monitor';
import { nsgNoOpenPortsCheck } from '../network';
import { sqlAuditingCheck, sqlPublicAccessCheck, sqlTlsCheck } from '../sql';
import {
  storageEncryptionCheck,
  storageHttpsTlsCheck,
  storagePublicAccessCheck,
} from '../storage';

interface Captured {
  passed: string[];
  failed: Array<{ title: string; severity: string }>;
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
    fail: (r) => failed.push({ title: r.title, severity: r.severity }),
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
