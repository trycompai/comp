import { describe, expect, it } from 'bun:test';
import type {
  CheckContext,
  CheckVariableValues,
  IntegrationCheck,
} from '../../../../types';
import { cloudSqlBackupsCheck } from '../cloud-sql-backups';
import { cloudSqlSslCheck } from '../cloud-sql-ssl';
import { iamPrimitiveRolesCheck } from '../iam-primitive-roles';
import { storagePublicAccessCheck } from '../storage-public-access';
import { vpcOpenFirewallsCheck } from '../vpc-open-firewalls';

interface Captured {
  passed: Array<{ resourceId: string; title: string }>;
  failed: Array<{ resourceId: string; title: string; severity: string }>;
}

async function runCheck(
  check: IntegrationCheck,
  opts: {
    variables?: CheckVariableValues;
    fetch?: (url: string) => unknown;
    post?: (url: string, body?: unknown) => unknown;
  },
): Promise<Captured> {
  const passed: Captured['passed'] = [];
  const failed: Captured['failed'] = [];

  const ctx = {
    accessToken: 'tok',
    credentials: {},
    variables: opts.variables ?? { project_ids: ['proj-1'] },
    connectionId: 'c1',
    organizationId: 'o1',
    metadata: {},
    log: () => {},
    warn: () => {},
    error: () => {},
    pass: (r) => passed.push({ resourceId: r.resourceId, title: r.title }),
    fail: (r) =>
      failed.push({
        resourceId: r.resourceId,
        title: r.title,
        severity: r.severity,
      }),
    fetch: (async <T,>(url: string): Promise<T> =>
      (opts.fetch ? opts.fetch(url) : {}) as T) as CheckContext['fetch'],
    post: (async <T,>(url: string, body?: unknown): Promise<T> =>
      (opts.post ? opts.post(url, body) : {}) as T) as CheckContext['post'],
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

describe('GCP IAM primitive roles check', () => {
  it('fails on roles/owner binding (high)', async () => {
    const { passed, failed } = await runCheck(iamPrimitiveRolesCheck, {
      post: () => ({ bindings: [{ role: 'roles/owner', members: ['user:a@x.com'] }] }),
    });
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.severity).toBe('high');
  });

  it('passes when only predefined roles are bound', async () => {
    const { passed, failed } = await runCheck(iamPrimitiveRolesCheck, {
      post: () => ({ bindings: [{ role: 'roles/viewer', members: ['user:a@x.com'] }] }),
    });
    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
  });

  it('ignores primitive roles with no members', async () => {
    const { passed, failed } = await runCheck(iamPrimitiveRolesCheck, {
      post: () => ({ bindings: [{ role: 'roles/owner', members: [] }] }),
    });
    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
  });
});

describe('GCP Cloud Storage public-access check', () => {
  it('fails buckets without uniform access / public-access-prevention', async () => {
    const { failed } = await runCheck(storagePublicAccessCheck, {
      fetch: () => ({
        items: [
          {
            name: 'b1',
            iamConfiguration: {
              uniformBucketLevelAccess: { enabled: false },
              publicAccessPrevention: 'inherited',
            },
          },
        ],
      }),
    });
    // both violations on the one bucket
    expect(failed.map((f) => f.title).join(' ')).toMatch(/Uniform bucket-level access/);
    expect(failed.map((f) => f.title).join(' ')).toMatch(/Public access prevention/);
  });

  it('passes when all buckets are locked down', async () => {
    const secure = {
      uniformBucketLevelAccess: { enabled: true },
      publicAccessPrevention: 'enforced',
    };
    const { passed, failed } = await runCheck(storagePublicAccessCheck, {
      fetch: () => ({ items: [{ name: 'b1', iamConfiguration: secure }] }),
    });
    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
  });

  it('emits nothing when a project has no buckets', async () => {
    const { passed, failed } = await runCheck(storagePublicAccessCheck, {
      fetch: () => ({ items: [] }),
    });
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(0);
  });
});

describe('GCP VPC open-firewalls check', () => {
  it('flags RDP (3389) open to 0.0.0.0/0 as critical', async () => {
    const { failed } = await runCheck(vpcOpenFirewallsCheck, {
      fetch: () => ({
        items: [
          {
            name: 'allow-rdp',
            sourceRanges: ['0.0.0.0/0'],
            allowed: [{ IPProtocol: 'tcp', ports: ['3389'] }],
          },
        ],
      }),
    });
    expect(failed).toHaveLength(1);
    expect(failed[0]!.severity).toBe('critical');
  });

  it('passes when no rule exposes sensitive ports (incl. disabled/egress/internal)', async () => {
    const { passed, failed } = await runCheck(vpcOpenFirewallsCheck, {
      fetch: () => ({
        items: [
          { name: 'https', sourceRanges: ['0.0.0.0/0'], allowed: [{ IPProtocol: 'tcp', ports: ['443'] }] },
          { name: 'internal-ssh', sourceRanges: ['10.0.0.0/8'], allowed: [{ IPProtocol: 'tcp', ports: ['22'] }] },
          { name: 'disabled', disabled: true, sourceRanges: ['0.0.0.0/0'], allowed: [{ IPProtocol: 'tcp', ports: ['22'] }] },
          { name: 'egress', direction: 'EGRESS', sourceRanges: ['0.0.0.0/0'], allowed: [{ IPProtocol: 'all' }] },
        ],
      }),
    });
    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
  });

  it('flags all-ports open as critical via port range covering 22', async () => {
    const { failed } = await runCheck(vpcOpenFirewallsCheck, {
      fetch: () => ({
        items: [
          { name: 'range', sourceRanges: ['0.0.0.0/0'], allowed: [{ IPProtocol: 'tcp', ports: ['20-25'] }] },
        ],
      }),
    });
    // 20-25 covers 22 (SSH, high) but not 3389
    expect(failed).toHaveLength(1);
    expect(failed[0]!.severity).toBe('high');
  });
});

describe('GCP Cloud SQL checks', () => {
  it('SSL: passes ENCRYPTED_ONLY, fails when unset', async () => {
    const ok = await runCheck(cloudSqlSslCheck, {
      fetch: () => ({ items: [{ name: 'db1', settings: { ipConfiguration: { sslMode: 'ENCRYPTED_ONLY' } } }] }),
    });
    expect(ok.passed).toHaveLength(1);
    expect(ok.failed).toHaveLength(0);

    const bad = await runCheck(cloudSqlSslCheck, {
      fetch: () => ({ items: [{ name: 'db2', settings: { ipConfiguration: {} } }] }),
    });
    expect(bad.failed).toHaveLength(1);
  });

  it('backups: passes when enabled, fails when disabled', async () => {
    const ok = await runCheck(cloudSqlBackupsCheck, {
      fetch: () => ({ items: [{ name: 'db1', settings: { backupConfiguration: { enabled: true } } }] }),
    });
    expect(ok.passed).toHaveLength(1);

    const bad = await runCheck(cloudSqlBackupsCheck, {
      fetch: () => ({ items: [{ name: 'db2', settings: { backupConfiguration: { enabled: false } } }] }),
    });
    expect(bad.failed).toHaveLength(1);
  });
});

describe('No projects resolved → check no-ops (no false pass)', () => {
  it('emits neither pass nor fail when no projects are selected or detected', async () => {
    const { passed, failed } = await runCheck(iamPrimitiveRolesCheck, {
      variables: {}, // no project_ids → falls back to detection
      fetch: (url) =>
        url.includes('organizations:search')
          ? { organizations: [] }
          : { projects: [] },
    });
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(0);
  });
});
