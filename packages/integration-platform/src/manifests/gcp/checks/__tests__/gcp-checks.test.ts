import { describe, expect, it } from 'bun:test';
import type { CheckContext, CheckVariableValues, IntegrationCheck } from '../../../../types';
import { cloudMonitoringAlertingCheck } from '../cloud-monitoring-alerting';
import { cloudSqlBackupsCheck } from '../cloud-sql-backups';
import { cloudSqlEncryptionCheck } from '../cloud-sql-encryption';
import { cloudSqlSslCheck } from '../cloud-sql-ssl';
import { classifyProjectEnv, environmentSeparationCheck } from '../environment-separation';
import { iamPrimitiveRolesCheck } from '../iam-primitive-roles';
import { isGcpApiDisabled } from '../shared';
import { storageEncryptionCheck } from '../storage-encryption';
import { storagePublicAccessCheck } from '../storage-public-access';
import { vpcOpenFirewallsCheck } from '../vpc-open-firewalls';

interface Captured {
  passed: Array<{
    resourceId: string;
    title: string;
    evidence?: Record<string, unknown>;
  }>;
  failed: Array<{
    resourceId: string;
    title: string;
    severity: string;
    remediation?: string;
    evidence?: Record<string, unknown>;
  }>;
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
    pass: (r) =>
      passed.push({
        resourceId: r.resourceId,
        title: r.title,
        evidence: r.evidence,
      }),
    fail: (r) =>
      failed.push({
        resourceId: r.resourceId,
        title: r.title,
        severity: r.severity,
        remediation: r.remediation,
        evidence: r.evidence,
      }),
    fetch: (async <T>(url: string): Promise<T> =>
      (opts.fetch ? opts.fetch(url) : {}) as T) as CheckContext['fetch'],
    post: (async <T>(url: string, body?: unknown): Promise<T> =>
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

describe('isGcpApiDisabled — service-not-enabled detection', () => {
  const httpErr = (status: number, message: string) => {
    const e = new Error(`HTTP ${status}: Forbidden - ${message}`);
    (e as Error & { status: number }).status = status;
    return e;
  };
  it('matches the real SERVICE_DISABLED 403 body', () => {
    expect(
      isGcpApiDisabled(
        httpErr(
          403,
          '{"error":{"code":403,"message":"Cloud SQL Admin API has not been used in project gen-lang-client-0670714718 before or it is disabled.","status":"PERMISSION_DENIED","details":[{"reason":"SERVICE_DISABLED"}]}}',
        ),
      ),
    ).toBe(true);
  });
  it('does NOT match a genuine permission denial', () => {
    expect(
      isGcpApiDisabled(
        httpErr(
          403,
          '{"error":{"code":403,"message":"The caller does not have permission","status":"PERMISSION_DENIED"}}',
        ),
      ),
    ).toBe(false);
  });
  it('does NOT match a transient 500', () => {
    expect(isGcpApiDisabled(httpErr(500, 'Internal error'))).toBe(false);
  });
});

describe('GCP checks skip projects whose service API is disabled', () => {
  const apiDisabled = () => {
    const e = new Error(
      'HTTP 403: Forbidden - Cloud SQL Admin API has not been used in project p before or it is disabled. (SERVICE_DISABLED)',
    );
    (e as Error & { status: number }).status = 403;
    return e;
  };
  it('cloud-sql-ssl emits NO finding when the API is disabled (vs a false "grant permission")', async () => {
    const out = await runCheck(cloudSqlSslCheck, {
      variables: { project_ids: ['p'] },
      fetch: () => {
        throw apiDisabled();
      },
    });
    expect(out.failed).toHaveLength(0);
    expect(out.passed).toHaveLength(0);
  });
  it('still reports a finding for a genuine permission denial', async () => {
    const denied = () => {
      const e = new Error('HTTP 403: Forbidden - The caller does not have permission');
      (e as Error & { status: number }).status = 403;
      return e;
    };
    const out = await runCheck(cloudSqlSslCheck, {
      variables: { project_ids: ['p'] },
      fetch: () => {
        throw denied();
      },
    });
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/Could not verify Cloud SQL SSL/);
  });
});

describe('GCP read-failure remediation gating', () => {
  const httpError = (status: number, message: string) => {
    const err = new Error(message);
    (err as Error & { status: number }).status = status;
    return err;
  };

  it('iam: a 403 policy read keeps the grant remediation and carries the error', async () => {
    const out = await runCheck(iamPrimitiveRolesCheck, {
      post: () => {
        throw httpError(403, 'HTTP 403: Forbidden - PERMISSION_DENIED');
      },
    });
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/Could not verify IAM primitive roles/);
    expect(out.failed[0]!.remediation).toContain('resourcemanager.projects.getIamPolicy');
    expect(out.failed[0]!.evidence).toMatchObject({
      error: 'HTTP 403: Forbidden - PERMISSION_DENIED',
    });
  });

  it('iam: a transient 500 policy read says re-run instead of claiming a missing permission', async () => {
    const out = await runCheck(iamPrimitiveRolesCheck, {
      post: () => {
        throw httpError(500, 'HTTP 500: Internal Server Error');
      },
    });
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.remediation).not.toContain('resourcemanager.projects.getIamPolicy');
    expect(out.failed[0]!.remediation).toMatch(/re-run/i);
    expect(out.failed[0]!.evidence).toMatchObject({
      error: 'HTTP 500: Internal Server Error',
    });
  });

  it('storage: a transient bucket-list failure says re-run; a denied one keeps the grant hint', async () => {
    const transient = await runCheck(storagePublicAccessCheck, {
      fetch: () => {
        throw httpError(503, 'HTTP 503: Service Unavailable');
      },
    });
    expect(transient.failed[0]!.title).toMatch(/Could not verify Cloud Storage/);
    expect(transient.failed[0]!.remediation).toMatch(/re-run/i);
    expect(transient.failed[0]!.remediation).not.toContain('storage.buckets.list');

    const denied = await runCheck(storagePublicAccessCheck, {
      fetch: () => {
        throw httpError(403, 'HTTP 403: Forbidden');
      },
    });
    expect(denied.failed[0]!.remediation).toContain('storage.buckets.list');
  });
});

describe('GCP project scope failure', () => {
  it('emits an explicit scope finding when project discovery fails', async () => {
    const err = new Error('HTTP 500: boom');
    (err as Error & { status: number }).status = 500;
    const out = await runCheck(vpcOpenFirewallsCheck, {
      variables: {},
      fetch: () => {
        throw err;
      },
    });
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/Could not verify GCP project scope/);
    expect(out.failed[0]!.remediation).toMatch(/re-run/i);
    expect(out.failed[0]!.evidence).toMatchObject({ readError: 'HTTP 500: boom' });
  });
});

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

  it('flags inherited primitive roles from an ancestor organization', async () => {
    const { failed } = await runCheck(iamPrimitiveRolesCheck, {
      post: (url) => {
        if (url.includes(':getAncestry')) {
          return {
            ancestor: [
              { resourceId: { type: 'project', id: 'proj-1' } },
              { resourceId: { type: 'organization', id: '12345' } },
            ],
          };
        }
        if (url.includes('/organizations/12345:getIamPolicy')) {
          return { bindings: [{ role: 'roles/owner', members: ['user:a@x.com'] }] };
        }
        return { bindings: [{ role: 'roles/viewer', members: ['user:b@x.com'] }] };
      },
    });
    expect(failed.some((f) => f.title.match(/Primitive role/))).toBe(true);
  });

  it('does not pass when inherited bindings are unreadable', async () => {
    const { passed, failed } = await runCheck(iamPrimitiveRolesCheck, {
      post: (url) => {
        if (url.includes(':getAncestry')) {
          return { ancestor: [{ resourceId: { type: 'folder', id: 'f1' } }] };
        }
        if (url.includes('/folders/f1:getIamPolicy')) throw new Error('403');
        return { bindings: [] }; // project clean
      },
    });
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(0);
  });

  it('fails closed when the project IAM policy cannot be read', async () => {
    // getBindings swallows the throw and returns null; the project read must
    // surface a "could not verify" finding rather than silently skipping the
    // project (which would leave the RBAC task stale-passing).
    const { passed, failed } = await runCheck(iamPrimitiveRolesCheck, {
      post: (url) => {
        if (url.includes(':getIamPolicy')) throw new Error('403');
        return {};
      },
    });
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.title).toMatch(/Could not verify IAM primitive roles/);
    expect(failed[0]!.severity).toBe('medium');
  });
});

describe('GCP Cloud Storage public-access check', () => {
  it('fails a bucket with uniform bucket-level access disabled', async () => {
    const { failed } = await runCheck(storagePublicAccessCheck, {
      fetch: () => ({
        items: [
          {
            name: 'b1',
            iamConfiguration: {
              uniformBucketLevelAccess: { enabled: false },
              // 'inherited' may be enforced by an org policy — must NOT add a
              // second false failure on top of the uniform-access finding.
              publicAccessPrevention: 'inherited',
            },
          },
        ],
      }),
    });
    expect(failed).toHaveLength(1);
    expect(failed[0]!.title).toMatch(/Uniform bucket-level access/);
  });

  it('does not fail solely on publicAccessPrevention inherited (org policy may enforce)', async () => {
    const { passed, failed } = await runCheck(storagePublicAccessCheck, {
      fetch: () => ({
        items: [
          {
            name: 'b1',
            iamConfiguration: {
              uniformBucketLevelAccess: { enabled: true },
              publicAccessPrevention: 'inherited',
            },
          },
        ],
      }),
    });
    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
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

  it('fails (high) a bucket whose IAM policy grants allUsers (UBLA alone is not enough)', async () => {
    const { passed, failed } = await runCheck(storagePublicAccessCheck, {
      fetch: (url) => {
        if (url.includes('/iam')) {
          return { bindings: [{ role: 'roles/storage.objectViewer', members: ['allUsers'] }] };
        }
        return {
          items: [
            {
              name: 'b1',
              iamConfiguration: {
                uniformBucketLevelAccess: { enabled: true },
                publicAccessPrevention: 'inherited',
              },
            },
          ],
        };
      },
    });
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.severity).toBe('high');
    expect(failed[0]!.title).toMatch(/publicly accessible/);
  });

  it('passes a bucket with publicAccessPrevention enforced without reading IAM', async () => {
    let iamRead = false;
    const { passed, failed } = await runCheck(storagePublicAccessCheck, {
      fetch: (url) => {
        if (url.includes('/iam')) {
          iamRead = true;
          return { bindings: [{ role: 'roles/storage.objectViewer', members: ['allUsers'] }] };
        }
        return {
          items: [
            {
              name: 'b1',
              iamConfiguration: {
                uniformBucketLevelAccess: { enabled: false },
                publicAccessPrevention: 'enforced',
              },
            },
          ],
        };
      },
    });
    expect(iamRead).toBe(false); // enforced is definitive; no IAM read needed
    expect(failed).toHaveLength(0);
    expect(passed).toHaveLength(1);
  });

  it('fails "could not verify" when a bucket IAM policy cannot be read', async () => {
    const { passed, failed } = await runCheck(storagePublicAccessCheck, {
      fetch: (url) => {
        if (url.includes('/iam')) throw new Error('403 forbidden');
        return {
          items: [
            {
              name: 'b1',
              iamConfiguration: {
                uniformBucketLevelAccess: { enabled: true },
                publicAccessPrevention: 'inherited',
              },
            },
          ],
        };
      },
    });
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.title).toMatch(/Could not verify/);
  });

  it('emits "could not verify" (not a silent pass) when the bucket list read fails', async () => {
    const { passed, failed } = await runCheck(storagePublicAccessCheck, {
      fetch: (url) => {
        if (url.includes('storage/v1/b')) throw new Error('403 forbidden');
        return {};
      },
    });
    // A project read failure must surface a finding, not leave the task stale.
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.title).toMatch(/Could not verify Cloud Storage/);
  });
});

describe('GCP project auto-discovery', () => {
  it('paginates discovered projects (follows nextPageToken) so all are evaluated', async () => {
    const { passed } = await runCheck(storagePublicAccessCheck, {
      variables: {}, // no project_ids → forces auto-discovery
      fetch: (url) => {
        if (url.includes('organizations:search')) return { organizations: [] };
        // page 2 must be matched before the generic projects branch
        if (url.includes('pageToken=tok2')) return { projects: [{ projectId: 'p2' }] };
        if (url.includes('/v1/projects')) {
          return { projects: [{ projectId: 'p1' }], nextPageToken: 'tok2' };
        }
        // bucket IAM policy read (must precede the bucket-list branch)
        if (url.includes('/iam')) return { bindings: [] };
        if (url.includes('storage/v1/b')) {
          return {
            items: [
              { name: 'b', iamConfiguration: { uniformBucketLevelAccess: { enabled: true } } },
            ],
          };
        }
        return {};
      },
    });
    // both the first- and second-page projects were scanned (per-bucket resourceId)
    expect(passed.map((p) => p.resourceId).sort()).toEqual(['p1/b', 'p2/b']);
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

  it('emits "could not verify" (not a silent pass) when the firewall list read fails', async () => {
    const { passed, failed } = await runCheck(vpcOpenFirewallsCheck, {
      fetch: () => {
        throw new Error('403 forbidden');
      },
    });
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.title).toMatch(/Could not verify VPC firewall rules/);
  });

  it('passes when no rule exposes sensitive ports (incl. disabled/egress/internal)', async () => {
    const { passed, failed } = await runCheck(vpcOpenFirewallsCheck, {
      fetch: () => ({
        items: [
          {
            name: 'https',
            sourceRanges: ['0.0.0.0/0'],
            allowed: [{ IPProtocol: 'tcp', ports: ['443'] }],
          },
          {
            name: 'internal-ssh',
            sourceRanges: ['10.0.0.0/8'],
            allowed: [{ IPProtocol: 'tcp', ports: ['22'] }],
          },
          {
            name: 'disabled',
            disabled: true,
            sourceRanges: ['0.0.0.0/0'],
            allowed: [{ IPProtocol: 'tcp', ports: ['22'] }],
          },
          {
            name: 'egress',
            direction: 'EGRESS',
            sourceRanges: ['0.0.0.0/0'],
            allowed: [{ IPProtocol: 'all' }],
          },
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
          {
            name: 'range',
            sourceRanges: ['0.0.0.0/0'],
            allowed: [{ IPProtocol: 'tcp', ports: ['20-25'] }],
          },
        ],
      }),
    });
    // 20-25 covers 22 (SSH, high) but not 3389
    expect(failed).toHaveLength(1);
    expect(failed[0]!.severity).toBe('high');
  });

  it('flags IPv6 ::/0 and sensitive ports across multiple tcp tuples', async () => {
    const ipv6 = await runCheck(vpcOpenFirewallsCheck, {
      fetch: () => ({
        items: [
          { name: 'v6', sourceRanges: ['::/0'], allowed: [{ IPProtocol: 'tcp', ports: ['3389'] }] },
        ],
      }),
    });
    expect(ipv6.failed[0]!.severity).toBe('critical');

    const multi = await runCheck(vpcOpenFirewallsCheck, {
      fetch: () => ({
        items: [
          {
            name: 'm',
            sourceRanges: ['0.0.0.0/0'],
            allowed: [
              { IPProtocol: 'tcp', ports: ['443'] },
              { IPProtocol: 'tcp', ports: ['22'] },
            ],
          },
        ],
      }),
    });
    expect(multi.failed.some((f) => f.title.match(/SSH/))).toBe(true);
  });
});

describe('GCP Cloud SQL checks', () => {
  it('SSL: passes ENCRYPTED_ONLY, fails when unset', async () => {
    const ok = await runCheck(cloudSqlSslCheck, {
      fetch: () => ({
        items: [{ name: 'db1', settings: { ipConfiguration: { sslMode: 'ENCRYPTED_ONLY' } } }],
      }),
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
      fetch: () => ({
        items: [{ name: 'db1', settings: { backupConfiguration: { enabled: true } } }],
      }),
    });
    expect(ok.passed).toHaveLength(1);

    const bad = await runCheck(cloudSqlBackupsCheck, {
      fetch: () => ({
        items: [{ name: 'db2', settings: { backupConfiguration: { enabled: false } } }],
      }),
    });
    expect(bad.failed).toHaveLength(1);
  });

  it('backups: skips read replicas (not configurable on them)', async () => {
    const out = await runCheck(cloudSqlBackupsCheck, {
      fetch: () => ({
        items: [
          {
            name: 'replica',
            masterInstanceName: 'primary',
            settings: { backupConfiguration: { enabled: false } },
          },
        ],
      }),
    });
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(0);
  });
});

describe('No projects resolved → check no-ops (no false pass)', () => {
  it('emits neither pass nor fail when no projects are selected or detected', async () => {
    const { passed, failed } = await runCheck(iamPrimitiveRolesCheck, {
      variables: {}, // no project_ids → falls back to detection
      fetch: (url) =>
        url.includes('organizations:search') ? { organizations: [] } : { projects: [] },
    });
    expect(passed).toHaveLength(0);
    expect(failed).toHaveLength(0);
  });
});

describe('GCP Cloud Monitoring — alerting and log export check', () => {
  // Branch a single mock by which API the check is calling.
  const monitorFetch = (opts: { policies?: unknown[]; sinks?: unknown[] }) => (url: string) => {
    if (url.includes('/alertPolicies')) {
      return { alertPolicies: opts.policies ?? [] };
    }
    if (url.includes('/sinks')) return { sinks: opts.sinks ?? [] };
    return {};
  };

  const status = (err: Error, code: number) => {
    (err as Error & { status: number }).status = code;
    return err;
  };

  it('passes both prongs: enabled alert policy with a channel + a configured sink', async () => {
    const out = await runCheck(cloudMonitoringAlertingCheck, {
      fetch: monitorFetch({
        policies: [
          {
            name: 'p1',
            displayName: 'High CPU',
            enabled: true,
            notificationChannels: ['projects/x/notificationChannels/1'],
          },
        ],
        sinks: [
          { name: 'export-bq', destination: 'bigquery.googleapis.com/x', disabled: false },
          { name: '_Default', disabled: false },
        ],
      }),
    });
    expect(out.failed).toHaveLength(0);
    expect(out.passed).toHaveLength(2);
    expect(out.passed.some((p) => /Alerting configured/.test(p.title))).toBe(true);
    expect(out.passed.some((p) => /Log export configured/.test(p.title))).toBe(true);
  });

  it('fails alerting when a policy has no notification channel (log export still passes)', async () => {
    const out = await runCheck(cloudMonitoringAlertingCheck, {
      fetch: monitorFetch({
        policies: [{ name: 'p1', enabled: true, notificationChannels: [] }],
        sinks: [{ name: 'export-bq', destination: 'storage.googleapis.com/b1', disabled: false }],
      }),
    });
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/No alerting configured/);
    expect(out.passed).toHaveLength(1);
    expect(out.passed[0]!.title).toMatch(/Log export configured/);
  });

  it('fails alerting when there are zero alert policies', async () => {
    const out = await runCheck(cloudMonitoringAlertingCheck, {
      fetch: monitorFetch({
        policies: [],
        sinks: [{ name: 'export', destination: 'bigquery.googleapis.com/x', disabled: false }],
      }),
    });
    expect(out.failed.some((f) => /No alerting configured/.test(f.title))).toBe(true);
  });

  it('treats an unset `enabled` field as enabled (API default)', async () => {
    const out = await runCheck(cloudMonitoringAlertingCheck, {
      fetch: monitorFetch({
        policies: [{ name: 'p1', notificationChannels: ['c1'] }], // no `enabled`
        sinks: [
          {
            name: 'export',
            destination: 'pubsub.googleapis.com/projects/x/topics/logs',
            disabled: false,
          },
        ],
      }),
    });
    expect(out.failed).toHaveLength(0);
    expect(out.passed).toHaveLength(2);
  });

  it('fails log export when only the managed _Default/_Required sinks exist', async () => {
    const out = await runCheck(cloudMonitoringAlertingCheck, {
      fetch: monitorFetch({
        policies: [{ name: 'p1', enabled: true, notificationChannels: ['c1'] }],
        sinks: [
          {
            name: '_Default',
            destination: 'logging.googleapis.com/projects/x/locations/global/buckets/_Default',
            disabled: false,
          },
          {
            name: '_Required',
            destination: 'logging.googleapis.com/projects/x/locations/global/buckets/_Required',
            disabled: false,
          },
        ],
      }),
    });
    expect(out.passed.some((p) => /Alerting configured/.test(p.title))).toBe(true);
    expect(out.failed.some((f) => /No log export configured/.test(f.title))).toBe(true);
  });

  it('does not count a disabled sink as log export', async () => {
    const out = await runCheck(cloudMonitoringAlertingCheck, {
      fetch: monitorFetch({
        policies: [{ name: 'p1', enabled: true, notificationChannels: ['c1'] }],
        sinks: [{ name: 'export', destination: 'bigquery.googleapis.com/x', disabled: true }],
      }),
    });
    expect(out.failed.some((f) => /No log export configured/.test(f.title))).toBe(true);
  });

  it('does not count a custom-named sink that still targets the _Default bucket', async () => {
    const out = await runCheck(cloudMonitoringAlertingCheck, {
      fetch: monitorFetch({
        policies: [{ name: 'p1', enabled: true, notificationChannels: ['c1'] }],
        sinks: [
          {
            name: 'my-sink', // non-default NAME, but routes to the default bucket
            destination: 'logging.googleapis.com/projects/x/locations/global/buckets/_Default',
            disabled: false,
          },
        ],
      }),
    });
    expect(out.failed.some((f) => /No log export configured/.test(f.title))).toBe(true);
  });

  it('counts a sink to a dedicated (non-default) Cloud Logging bucket as export', async () => {
    const out = await runCheck(cloudMonitoringAlertingCheck, {
      fetch: monitorFetch({
        policies: [{ name: 'p1', enabled: true, notificationChannels: ['c1'] }],
        sinks: [
          {
            name: 'audit',
            destination: 'logging.googleapis.com/projects/x/locations/global/buckets/audit-7yr',
            disabled: false,
          },
        ],
      }),
    });
    expect(out.failed).toHaveLength(0);
    expect(out.passed.some((p) => /Log export configured/.test(p.title))).toBe(true);
  });

  it('fails "could not verify" alerting on a genuine permission error (log export unaffected)', async () => {
    const out = await runCheck(cloudMonitoringAlertingCheck, {
      fetch: (url) => {
        if (url.includes('/alertPolicies')) {
          throw status(new Error('HTTP 403: Forbidden - The caller does not have permission'), 403);
        }
        if (url.includes('/sinks')) {
          return {
            sinks: [{ name: 'export', destination: 'storage.googleapis.com/b', disabled: false }],
          };
        }
        return {};
      },
    });
    expect(out.failed.some((f) => /Could not verify alerting/.test(f.title))).toBe(true);
    expect(out.passed.some((p) => /Log export configured/.test(p.title))).toBe(true);
  });

  it('skips a project whose Monitoring/Logging APIs are disabled (no false finding)', async () => {
    const out = await runCheck(cloudMonitoringAlertingCheck, {
      fetch: () => {
        throw status(
          new Error(
            'HTTP 403: Forbidden - Cloud Monitoring API has not been used in project p before or it is disabled. (SERVICE_DISABLED)',
          ),
          403,
        );
      },
    });
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(0);
  });
});

describe('GCP Cloud Storage encryption check', () => {
  const status = (err: Error, code: number) => {
    (err as Error & { status: number }).status = code;
    return err;
  };

  it('passes a bucket and reports Google-managed encryption by default', async () => {
    const out = await runCheck(storageEncryptionCheck, {
      fetch: () => ({ items: [{ name: 'b1', location: 'US' }] }),
    });
    expect(out.failed).toHaveLength(0);
    expect(out.passed).toHaveLength(1);
    expect(out.passed[0]!.evidence).toMatchObject({
      keyType: 'Google-managed',
      defaultKmsKeyName: null,
    });
  });

  it('reports CMEK when a default KMS key is set on the bucket', async () => {
    const key = 'projects/x/locations/us/keyRings/r/cryptoKeys/k';
    const out = await runCheck(storageEncryptionCheck, {
      fetch: () => ({
        items: [{ name: 'b1', encryption: { defaultKmsKeyName: key } }],
      }),
    });
    expect(out.passed[0]!.evidence).toMatchObject({
      keyType: 'CMEK',
      defaultKmsKeyName: key,
    });
  });

  it('emits nothing when a project has no buckets', async () => {
    const out = await runCheck(storageEncryptionCheck, {
      fetch: () => ({ items: [] }),
    });
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(0);
  });

  it('fails "could not verify" when the bucket list read fails', async () => {
    const out = await runCheck(storageEncryptionCheck, {
      fetch: () => {
        throw status(new Error('HTTP 403: Forbidden'), 403);
      },
    });
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/Could not verify Cloud Storage encryption/);
  });

  it('skips a project whose Storage API is disabled (no false finding)', async () => {
    const out = await runCheck(storageEncryptionCheck, {
      fetch: () => {
        throw status(
          new Error(
            'HTTP 403: Forbidden - Cloud Storage API has not been used in project p before or it is disabled. (SERVICE_DISABLED)',
          ),
          403,
        );
      },
    });
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(0);
  });
});

describe('GCP Cloud SQL encryption check', () => {
  const status = (err: Error, code: number) => {
    (err as Error & { status: number }).status = code;
    return err;
  };

  it('passes an instance and reports Google-managed encryption by default', async () => {
    const out = await runCheck(cloudSqlEncryptionCheck, {
      fetch: () => ({ items: [{ name: 'db1', region: 'us-central1' }] }),
    });
    expect(out.failed).toHaveLength(0);
    expect(out.passed).toHaveLength(1);
    expect(out.passed[0]!.evidence).toMatchObject({
      keyType: 'Google-managed',
      kmsKeyName: null,
    });
  });

  it('reports CMEK when diskEncryptionConfiguration is set', async () => {
    const key = 'projects/x/locations/us/keyRings/r/cryptoKeys/k';
    const out = await runCheck(cloudSqlEncryptionCheck, {
      fetch: () => ({
        items: [{ name: 'db1', diskEncryptionConfiguration: { kmsKeyName: key } }],
      }),
    });
    expect(out.passed[0]!.evidence).toMatchObject({ keyType: 'CMEK', kmsKeyName: key });
  });

  it('fails "could not verify" when the instance list read fails', async () => {
    const out = await runCheck(cloudSqlEncryptionCheck, {
      fetch: () => {
        throw status(new Error('HTTP 403: Forbidden'), 403);
      },
    });
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/Could not verify Cloud SQL encryption/);
  });
});

describe('classifyProjectEnv — token matching', () => {
  it('classifies by name token (any separator, incl. underscore)', () => {
    expect(classifyProjectEnv({ projectId: 'myapp-prod' })).toBe('production');
    expect(classifyProjectEnv({ projectId: 'myapp-dev-123' })).toBe('development');
    expect(classifyProjectEnv({ projectId: 'web-staging' })).toBe('staging');
    expect(classifyProjectEnv({ projectId: 'myapp_prod' })).toBe('production');
  });

  it('prefers an explicit environment label over the name', () => {
    expect(
      classifyProjectEnv({ projectId: 'proj-001', labels: { environment: 'production' } }),
    ).toBe('production');
    expect(classifyProjectEnv({ projectId: 'proj-002', labels: { env: 'qa' } })).toBe('test');
  });

  it('does NOT false-match substrings like product/developer', () => {
    expect(classifyProjectEnv({ projectId: 'product-catalog' })).toBeNull();
    expect(classifyProjectEnv({ projectId: 'developer-portal' })).toBeNull();
    expect(classifyProjectEnv({ projectId: 'data-warehouse' })).toBeNull();
  });

  it('treats preprod as staging, not production', () => {
    expect(classifyProjectEnv({ projectId: 'app-preprod' })).toBe('staging');
  });
});

describe('GCP environment-separation check', () => {
  const status = (err: Error, code: number) => {
    (err as Error & { status: number }).status = code;
    return err;
  };
  // `variables: {}` forces unscoped discovery (the project_ids-less default),
  // so the mock can return the `/v1/projects` list shape.
  const UNSCOPED = {};

  it('passes when production is separated from a non-production env (by name)', async () => {
    const out = await runCheck(environmentSeparationCheck, {
      variables: UNSCOPED,
      fetch: () => ({
        projects: [{ projectId: 'myapp-prod' }, { projectId: 'myapp-dev' }],
      }),
    });
    expect(out.failed).toHaveLength(0);
    expect(out.passed).toHaveLength(1);
    expect(out.passed[0]!.title).toMatch(/Environments separated/);
    expect(out.passed[0]!.evidence).toMatchObject({
      detectedEnvironments: expect.arrayContaining(['production', 'development']),
    });
  });

  it('passes when environments are distinguished by labels (prod + staging)', async () => {
    const out = await runCheck(environmentSeparationCheck, {
      variables: UNSCOPED,
      fetch: () => ({
        projects: [
          { projectId: 'a', labels: { environment: 'production' } },
          { projectId: 'b', labels: { environment: 'staging' } },
        ],
      }),
    });
    expect(out.failed).toHaveLength(0);
    expect(out.passed).toHaveLength(1);
  });

  it('evaluates projects across multiple pages (unscoped discovery)', async () => {
    const out = await runCheck(environmentSeparationCheck, {
      variables: UNSCOPED,
      fetch: (url) => {
        if (url.includes('pageToken=tok2')) {
          return { projects: [{ projectId: 'app-dev' }] };
        }
        return { projects: [{ projectId: 'app-prod' }], nextPageToken: 'tok2' };
      },
    });
    expect(out.failed).toHaveLength(0);
    expect(out.passed).toHaveLength(1);
  });

  it('does not pass when discovery is capped even if scanned projects show separation', async () => {
    const out = await runCheck(environmentSeparationCheck, {
      variables: UNSCOPED,
      fetch: (url) => {
        const page = Number(new URLSearchParams(url.split('?')[1] ?? '').get('pageToken') ?? '0');
        return {
          projects: [{ projectId: page === 0 ? 'myapp-prod' : 'myapp-dev' }],
          nextPageToken: String(page + 1),
        };
      },
    });
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/Could not verify environment separation/);
    expect(out.failed[0]!.evidence).toMatchObject({ discoveryTruncated: true });
  });

  it('honors project_ids scope: fetches selected projects, never lists all', async () => {
    const out = await runCheck(environmentSeparationCheck, {
      variables: { project_ids: ['p-prod', 'p-dev'] },
      fetch: (url) => {
        if (url.includes('/v1/projects/p-prod')) {
          return { projectId: 'p-prod', labels: { environment: 'production' } };
        }
        if (url.includes('/v1/projects/p-dev')) {
          return { projectId: 'p-dev', labels: { environment: 'development' } };
        }
        // The list endpoint must NOT be called when projects are selected.
        throw new Error(`unexpected list call: ${url}`);
      },
    });
    expect(out.failed).toHaveLength(0);
    expect(out.passed).toHaveLength(1);
  });

  it('fails when only non-production environments are present (no production)', async () => {
    const out = await runCheck(environmentSeparationCheck, {
      variables: UNSCOPED,
      fetch: () => ({
        projects: [{ projectId: 'app-dev' }, { projectId: 'app-staging' }],
      }),
    });
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/Could not confirm environment separation/);
  });

  it('fails when only production is present (no non-production)', async () => {
    const out = await runCheck(environmentSeparationCheck, {
      variables: UNSCOPED,
      fetch: () => ({ projects: [{ projectId: 'myapp-prod' }] }),
    });
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/Could not confirm environment separation/);
    expect(out.failed[0]!.remediation).toMatch(/distinct GCP projects/);
  });

  it('fails clearly when production is detected but another project is unclassified', async () => {
    const out = await runCheck(environmentSeparationCheck, {
      variables: UNSCOPED,
      fetch: () => ({
        projects: [{ projectId: 'nymph-prod-480000' }, { projectId: 'nymph-480000' }],
      }),
    });
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.evidence).toMatchObject({ unclassifiedProjectCount: 1 });
  });

  it('fails when no project can be classified', async () => {
    const out = await runCheck(environmentSeparationCheck, {
      variables: UNSCOPED,
      fetch: () => ({
        projects: [{ projectId: 'product-catalog' }, { projectId: 'backend' }],
      }),
    });
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/Could not confirm environment separation/);
  });

  it('surfaces truncation as "could not verify" when discovery is capped', async () => {
    // Every page returns more pages → the 20-page cap trips; classify only
    // non-prod so the verdict is a fail that must disclose the partial scan.
    const out = await runCheck(environmentSeparationCheck, {
      variables: UNSCOPED,
      fetch: () => ({
        projects: [{ projectId: 'app-dev' }],
        nextPageToken: 'next',
      }),
    });
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/Could not verify environment separation/);
    expect(out.failed[0]!.evidence).toMatchObject({ discoveryTruncated: true });
  });

  it('fails when no projects are accessible (unscoped)', async () => {
    const out = await runCheck(environmentSeparationCheck, {
      variables: UNSCOPED,
      fetch: () => ({ projects: [] }),
    });
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/No GCP projects detected/);
  });

  it('fails "could not verify" when unscoped discovery read fails', async () => {
    const out = await runCheck(environmentSeparationCheck, {
      variables: UNSCOPED,
      fetch: () => {
        throw status(new Error('HTTP 403: Forbidden'), 403);
      },
    });
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/Could not verify environment separation/);
  });

  it('fails "could not verify" when a selected (scoped) project cannot be read', async () => {
    const out = await runCheck(environmentSeparationCheck, {
      variables: { project_ids: ['p1'] },
      fetch: () => {
        throw status(new Error('HTTP 403: Forbidden'), 403);
      },
    });
    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/Could not verify environment separation/);
  });
});
