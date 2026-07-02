// Regression tests for CS-702: the automated daily cloud scan appeared to
// return far fewer results than a manual scan. Root cause was in the
// latest-run lookups here — they picked the newest IntegrationCheckRun per
// connection with NO checkId scope, so the ~06:00 per-task evidence runs (a
// handful of results each) shadowed the ~05:00 full cloud-security scan
// (hundreds of results). These tests reproduce that exact ordering via a
// Prisma mock that emulates where + orderBy + distinct.

interface RunRow {
  id: string;
  connectionId: string;
  checkId: string;
  taskId: string | null;
  status: string;
  completedAt: Date;
  durationMs: number | null;
  totalChecked: number | null;
  passedCount: number | null;
  failedCount: number | null;
}

interface ResultRow {
  id: string;
  title: string;
  description: string | null;
  remediation: string | null;
  severity: string | null;
  collectedAt: Date;
  checkRunId: string;
  passed: boolean;
  evidence: Record<string, unknown> | null;
  resourceId: string | null;
  resourceType: string | null;
}

// In-memory fixtures the mocked Prisma layer reads from. Set per-test.
let runRows: RunRow[] = [];
let resultRows: ResultRow[] = [];

// Emulate the slice of Prisma semantics these queries rely on: filter by the
// provided `where`, order by completedAt desc, then distinct-by-connectionId
// (Postgres DISTINCT ON keeps the first row after ordering).
function checkRunFindMany(args: {
  where: {
    connectionId?: { in: string[] };
    checkId?: { in: string[] };
    status?: { in: string[] };
  };
  distinct?: string[];
}): Promise<RunRow[]> {
  const { where } = args;
  let rows = runRows.filter((r) => {
    if (where.connectionId && !where.connectionId.in.includes(r.connectionId)) {
      return false;
    }
    if (where.checkId && !where.checkId.in.includes(r.checkId)) return false;
    if (where.status && !where.status.in.includes(r.status)) return false;
    return true;
  });
  rows = [...rows].sort(
    (a, b) => b.completedAt.getTime() - a.completedAt.getTime(),
  );
  if (args.distinct?.includes('connectionId')) {
    const seen = new Set<string>();
    rows = rows.filter((r) => {
      if (seen.has(r.connectionId)) return false;
      seen.add(r.connectionId);
      return true;
    });
  }
  return Promise.resolve(rows);
}

function checkResultFindMany(args: {
  where: { checkRunId: { in: string[] } };
}): Promise<ResultRow[]> {
  const ids = args.where.checkRunId.in;
  return Promise.resolve(resultRows.filter((r) => ids.includes(r.checkRunId)));
}

const dbMock = {
  integrationConnection: { findMany: jest.fn() },
  integration: { findMany: jest.fn() },
  integrationCheckRun: { findMany: jest.fn(checkRunFindMany) },
  integrationCheckResult: { findMany: jest.fn(checkResultFindMany) },
};

jest.mock('@db', () => ({ db: dbMock }));
jest.mock('@trycompai/integration-platform', () => ({ getManifest: jest.fn() }));
jest.mock('./evidence-sanitizer', () => ({
  sanitizeEvidence: (v: unknown) => v,
}));
jest.mock('./check-definition.utils', () => ({
  resolveCheckKey: jest.fn(() => 'check-key'),
}));
jest.mock('./cloud-security-query.legacy', () => ({
  getLegacyFindings: jest.fn().mockResolvedValue([]),
}));
jest.mock('./finding-exceptions', () => ({
  loadActiveExceptionSet: jest.fn().mockResolvedValue({ size: 0 }),
}));

import { getManifest } from '@trycompai/integration-platform';
import { CloudSecurityQueryService } from './cloud-security-query.service';

const ORG_ID = 'org_test';
const CONNECTION_ID = 'icn_aws';
const SCAN_AT = new Date('2026-07-02T05:00:00Z'); // full scan
const TASK_AT = new Date('2026-07-02T06:00:00Z'); // per-task run — NEWER

const awsConnection = {
  id: CONNECTION_ID,
  organizationId: ORG_ID,
  provider: { slug: 'aws', name: 'AWS' },
  metadata: {},
  variables: {},
  status: 'active',
  lastSyncAt: TASK_AT,
  createdAt: SCAN_AT,
  updatedAt: TASK_AT,
};

// The 05:00 full scan: many results, taskId null, checkId 'aws-security-scan'.
const scanRun: RunRow = {
  id: 'run_scan',
  connectionId: CONNECTION_ID,
  checkId: 'aws-security-scan',
  taskId: null,
  status: 'success',
  completedAt: SCAN_AT,
  durationMs: 5000,
  totalChecked: 300,
  passedCount: 250,
  failedCount: 50,
};

// The 06:00 per-task evidence run: a handful of results, taskId set, checkId
// is a manifest check id. This is the run that used to shadow the scan.
const taskRun: RunRow = {
  id: 'run_task',
  connectionId: CONNECTION_ID,
  checkId: 'aws-iam-account-security',
  taskId: 'tsk_iam',
  status: 'failed',
  completedAt: TASK_AT,
  durationMs: 120,
  totalChecked: 3,
  passedCount: 1,
  failedCount: 2,
};

function scanResult(id: string): ResultRow {
  return {
    id,
    title: `scan-${id}`,
    description: null,
    remediation: null,
    severity: 'medium',
    collectedAt: SCAN_AT,
    checkRunId: 'run_scan',
    passed: false,
    evidence: {},
    resourceId: `res-${id}`,
    resourceType: 'AwsResource',
  };
}

const taskResult: ResultRow = {
  id: 'task_only',
  title: 'task-only',
  description: null,
  remediation: null,
  severity: 'high',
  collectedAt: TASK_AT,
  checkRunId: 'run_task',
  passed: false,
  evidence: {},
  resourceId: 'res-task',
  resourceType: 'AwsResource',
};

describe('CloudSecurityQueryService — latest-run scoping (CS-702)', () => {
  let service: CloudSecurityQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CloudSecurityQueryService();

    // Both runs exist for the same connection; the per-task run is newer.
    runRows = [scanRun, taskRun];
    resultRows = [
      scanResult('a'),
      scanResult('b'),
      scanResult('c'),
      taskResult,
    ];

    dbMock.integrationConnection.findMany.mockResolvedValue([awsConnection]);
    dbMock.integration.findMany.mockResolvedValue([]);
    dbMock.integrationCheckRun.findMany.mockImplementation(checkRunFindMany);
    dbMock.integrationCheckResult.findMany.mockImplementation(
      checkResultFindMany,
    );
    (getManifest as jest.Mock).mockReturnValue({
      supportsMultipleConnections: true,
      variables: [],
      checks: [],
    });
  });

  it('getFindings returns the full-scan results, not the newer per-task run', async () => {
    const findings = await service.getFindings(ORG_ID);

    // The three scan findings — and none from the per-task run.
    expect(findings).toHaveLength(3);
    expect(findings.map((f) => f.id).sort()).toEqual(['a', 'b', 'c']);
    expect(findings.every((f) => f.checkId === 'aws-security-scan')).toBe(true);
    expect(findings.some((f) => f.id === 'task_only')).toBe(false);
  });

  it('getProviders reports the full-scan summary, not the per-task run summary', async () => {
    const providers = await service.getProviders(ORG_ID);

    const aws = providers.find((p) => p.id === CONNECTION_ID);
    expect(aws?.latestRun).toEqual(
      expect.objectContaining({
        totalChecked: 300,
        passedCount: 250,
        failedCount: 50,
      }),
    );
  });

  it('scopes the latest-run lookup to cloud-security scan checkIds', async () => {
    await service.getFindings(ORG_ID);

    expect(dbMock.integrationCheckRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          checkId: {
            in: ['aws-security-scan', 'gcp-security-scan', 'azure-security-scan'],
          },
        }),
      }),
    );
  });
});
