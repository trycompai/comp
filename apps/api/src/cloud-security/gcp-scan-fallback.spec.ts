import type { RunAllChecksResult } from '@trycompai/integration-platform';
import {
  GCP_SCAN_MODE_DIRECT,
  GCP_SCAN_MODE_SCC,
  gcpCheckResultsToFindings,
  isSccStructurallyUnavailable,
  toCheckCredentials,
  toCheckVariables,
} from './gcp-scan-fallback';

describe('isSccStructurallyUnavailable', () => {
  it.each([
    'SCC_NOT_ACTIVATED: Security Command Center is not activated for project x.',
    'Security Command Center Legacy has been disabled by Google. Please activate the Standard or Premium tier.',
    'Permission denied. Grant "Security Center Findings Viewer" role at the organization level.',
  ])('treats structural SCC errors as unavailable: %s', (message) => {
    expect(isSccStructurallyUnavailable(new Error(message))).toBe(true);
  });

  it.each([
    'OAuth scopes insufficient. Reconnect the GCP integration.',
    'GCP API error (500): internal error',
    'GCP API error (429): rate limited',
    'some unexpected network blip',
  ])('treats transient/unknown errors as NOT structural: %s', (message) => {
    expect(isSccStructurallyUnavailable(new Error(message))).toBe(false);
  });

  it('handles non-Error throwables', () => {
    expect(isSccStructurallyUnavailable('SCC_NOT_ACTIVATED: nope')).toBe(true);
    expect(isSccStructurallyUnavailable(undefined)).toBe(false);
  });

  it('exposes distinct run-source tags', () => {
    expect(GCP_SCAN_MODE_SCC).not.toBe(GCP_SCAN_MODE_DIRECT);
  });
});

describe('toCheckCredentials', () => {
  it('keeps strings and all-string arrays, drops everything else', () => {
    expect(
      toCheckCredentials({
        access_token: 'tok',
        regions: ['us', 'eu'],
        count: 3,
        nested: { a: 1 },
        mixed: ['ok', 2],
      }),
    ).toEqual({ access_token: 'tok', regions: ['us', 'eu'] });
  });
});

describe('toCheckVariables', () => {
  it('keeps primitives + string[] + undefined, drops mixed arrays and objects', () => {
    expect(
      toCheckVariables({
        project_ids: ['a', 'b'],
        name: 'x',
        max: 10,
        enabled: true,
        optional: undefined,
        mixed: ['a', 1],
        obj: { k: 'v' },
      }),
    ).toEqual({
      project_ids: ['a', 'b'],
      name: 'x',
      max: 10,
      enabled: true,
      optional: undefined,
    });
  });
});

describe('gcpCheckResultsToFindings', () => {
  const result: RunAllChecksResult = {
    durationMs: 1,
    totalFindings: 1,
    totalPassing: 1,
    results: [
      {
        checkId: 'storage-public-access',
        checkName: 'Storage public access',
        status: 'failed',
        durationMs: 1,
        result: {
          logs: [],
          summary: { totalChecked: 2, passed: 1, failed: 1 },
          findings: [
            {
              status: 'open',
              title: 'Bucket publicly accessible: b1',
              description: 'public',
              resourceType: 'gcp-storage-bucket',
              resourceId: 'proj/b1',
              severity: 'high',
              remediation: 'remove allUsers',
              evidence: { bucket: 'b1', findingKey: 'k1' },
            },
          ],
          passingResults: [
            {
              collectedAt: new Date(),
              title: 'Bucket private: b2',
              description: 'ok',
              resourceType: 'gcp-storage-bucket',
              resourceId: 'proj/b2',
              evidence: { bucket: 'b2' },
            },
          ],
        },
      },
    ],
  };

  it('maps failures to passed:false and passing to passed:true info findings', () => {
    const findings = gcpCheckResultsToFindings(result);
    expect(findings).toHaveLength(2);

    const failure = findings.find((f) => !f.passed);
    expect(failure).toMatchObject({
      title: 'Bucket publicly accessible: b1',
      severity: 'high',
      resourceType: 'gcp-storage-bucket',
      resourceId: 'proj/b1',
      remediation: 'remove allUsers',
      passed: false,
    });
    // Evidence preserved verbatim (findingKey carries through for reconciliation)
    expect(failure?.evidence).toEqual({ bucket: 'b1', findingKey: 'k1' });

    const passing = findings.find((f) => f.passed);
    expect(passing).toMatchObject({
      title: 'Bucket private: b2',
      severity: 'info',
      passed: true,
    });
  });

  it('returns [] for an empty result set', () => {
    expect(
      gcpCheckResultsToFindings({
        durationMs: 0,
        totalFindings: 0,
        totalPassing: 0,
        results: [],
      }),
    ).toEqual([]);
  });
});
