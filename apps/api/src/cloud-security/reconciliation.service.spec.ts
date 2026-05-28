// Reconciliation walks the IntegrationCheckRun pairs and writes
// FindingResolution + FindingRegression rows. These tests exercise the
// branching logic via a Prisma mock — no real DB needed.

const dbMock = {
  integrationCheckRun: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  findingResolution: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  findingRegression: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  remediationAction: {
    findFirst: jest.fn(),
  },
};

jest.mock('@db', () => ({
  db: dbMock,
  FindingResolutionMethod: {
    platform_fix: 'platform_fix',
    external_fix: 'external_fix',
    resource_deleted: 'resource_deleted',
    exception_marked: 'exception_marked',
  },
}));

import { CloudReconciliationService } from './reconciliation.service';
import type { CloudExceptionService } from './exception.service';

// Hand-rolled stub for the exception service — the reconciliation only calls
// isExceptionActive on it.
function makeExceptionsStub(active = false): CloudExceptionService {
  return {
    isExceptionActive: jest.fn().mockResolvedValue(active),
  } as unknown as CloudExceptionService;
}

const PRIOR_RUN_TIME = new Date('2026-05-01T00:00:00Z');
const CURRENT_RUN_TIME = new Date('2026-05-13T00:00:00Z');

let resultIdCounter = 0;
function makeResult(opts: {
  findingKey: string;
  resourceId: string;
  passed: boolean;
  resourceType?: string;
  serviceId?: string;
  id?: string;
}) {
  return {
    id: opts.id ?? `icrr_${++resultIdCounter}`,
    passed: opts.passed,
    resourceId: opts.resourceId,
    resourceType: opts.resourceType ?? 'AwsIamUser',
    evidence: {
      findingKey: opts.findingKey,
      serviceId: opts.serviceId ?? 'iam',
    },
  };
}

function setupRuns(opts: {
  currentResults: ReturnType<typeof makeResult>[];
  priorResults: ReturnType<typeof makeResult>[];
  scannedServices?: string[];
}) {
  dbMock.integrationCheckRun.findUnique.mockResolvedValueOnce({
    id: 'icr_current',
    connectionId: 'icn_aws',
    status: 'success',
    startedAt: CURRENT_RUN_TIME,
    completedAt: CURRENT_RUN_TIME,
    scannedServices: opts.scannedServices ?? [],
    connection: { organizationId: 'org_1' },
    results: opts.currentResults,
  });
  dbMock.integrationCheckRun.findFirst.mockResolvedValueOnce({
    id: 'icr_prior',
    completedAt: PRIOR_RUN_TIME,
    results: opts.priorResults,
  });
}

describe('CloudReconciliationService.reconcile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbMock.findingResolution.findFirst.mockResolvedValue(null);
    dbMock.findingRegression.findFirst.mockResolvedValue(null);
    dbMock.findingRegression.create.mockResolvedValue({ id: 'freg_x' });
    dbMock.findingResolution.create.mockResolvedValue({ id: 'fres_x' });
    dbMock.remediationAction.findFirst.mockResolvedValue(null);
  });

  it('skips reconciliation when current run is not successful', async () => {
    dbMock.integrationCheckRun.findUnique.mockResolvedValueOnce({
      id: 'icr_current',
      status: 'failed',
      connection: { organizationId: 'org_1' },
      results: [],
    });
    const service = new CloudReconciliationService(makeExceptionsStub());
    const result = await service.reconcile({ currentRunId: 'icr_current' });
    expect(result).toEqual({ resolutions: 0, regressions: 0, skipped: true });
  });

  it('is idempotent — skips if FindingResolution rows already exist for this run', async () => {
    dbMock.integrationCheckRun.findUnique.mockResolvedValueOnce({
      id: 'icr_current',
      status: 'success',
      connection: { organizationId: 'org_1' },
      results: [],
      scannedServices: [],
    });
    dbMock.findingResolution.findFirst.mockResolvedValueOnce({ id: 'fres_existing' });

    const service = new CloudReconciliationService(makeExceptionsStub());
    const result = await service.reconcile({ currentRunId: 'icr_current' });
    expect(result.skipped).toBe(true);
    expect(dbMock.findingResolution.create).not.toHaveBeenCalled();
  });

  it('is idempotent for runs that produced only regressions (no resolutions)', async () => {
    // Regression-only runs would otherwise re-execute reconciliation and
    // duplicate FindingRegression rows.
    dbMock.integrationCheckRun.findUnique.mockResolvedValueOnce({
      id: 'icr_current',
      status: 'success',
      connection: { organizationId: 'org_1' },
      results: [],
      scannedServices: [],
    });
    dbMock.findingResolution.findFirst.mockResolvedValueOnce(null);
    dbMock.findingRegression.findFirst.mockResolvedValueOnce({ id: 'freg_existing' });

    const service = new CloudReconciliationService(makeExceptionsStub());
    const result = await service.reconcile({ currentRunId: 'icr_current' });
    expect(result.skipped).toBe(true);
    expect(dbMock.findingRegression.create).not.toHaveBeenCalled();
  });

  it('returns 0/0 on first scan (no prior run)', async () => {
    dbMock.integrationCheckRun.findUnique.mockResolvedValueOnce({
      id: 'icr_current',
      status: 'success',
      connection: { organizationId: 'org_1' },
      results: [],
      scannedServices: [],
    });
    dbMock.integrationCheckRun.findFirst.mockResolvedValueOnce(null);

    const service = new CloudReconciliationService(makeExceptionsStub());
    const result = await service.reconcile({ currentRunId: 'icr_current' });
    expect(result).toEqual({ resolutions: 0, regressions: 0, skipped: false });
  });

  it('records resource_deleted when a prior failure is missing from the current run', async () => {
    setupRuns({
      currentResults: [],
      priorResults: [
        makeResult({ findingKey: 'iam-no-mfa-john', resourceId: 'john', passed: false }),
      ],
    });

    const service = new CloudReconciliationService(makeExceptionsStub());
    const result = await service.reconcile({ currentRunId: 'icr_current' });

    expect(result.resolutions).toBe(1);
    expect(dbMock.findingResolution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          resolutionMethod: 'resource_deleted',
          checkId: 'iam-no-mfa',
          resourceId: 'john',
        }),
      }),
    );
  });

  it('records external_fix when a prior failure is now passing and no RemediationAction matches', async () => {
    setupRuns({
      currentResults: [
        makeResult({ findingKey: 'iam-no-mfa-john', resourceId: 'john', passed: true }),
      ],
      priorResults: [
        makeResult({ findingKey: 'iam-no-mfa-john', resourceId: 'john', passed: false }),
      ],
    });

    const service = new CloudReconciliationService(makeExceptionsStub());
    await service.reconcile({ currentRunId: 'icr_current' });

    expect(dbMock.findingResolution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ resolutionMethod: 'external_fix' }),
      }),
    );
  });

  it('records platform_fix when a successful RemediationAction lands between scans', async () => {
    setupRuns({
      currentResults: [
        makeResult({ findingKey: 'iam-no-mfa-john', resourceId: 'john', passed: true }),
      ],
      priorResults: [
        makeResult({ findingKey: 'iam-no-mfa-john', resourceId: 'john', passed: false }),
      ],
    });
    dbMock.remediationAction.findFirst.mockResolvedValueOnce({
      id: 'rma_1',
      initiatedById: 'usr_42',
    });

    const service = new CloudReconciliationService(makeExceptionsStub());
    await service.reconcile({ currentRunId: 'icr_current' });

    expect(dbMock.findingResolution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          resolutionMethod: 'platform_fix',
          remediationActionId: 'rma_1',
          resolvedById: 'usr_42',
        }),
      }),
    );
  });

  it('records exception_marked when the user marked an exception between scans', async () => {
    setupRuns({
      currentResults: [],
      priorResults: [
        makeResult({ findingKey: 'iam-no-mfa-john', resourceId: 'john', passed: false }),
      ],
    });

    const service = new CloudReconciliationService(makeExceptionsStub(true));
    await service.reconcile({ currentRunId: 'icr_current' });

    expect(dbMock.findingResolution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ resolutionMethod: 'exception_marked' }),
      }),
    );
  });

  it('does NOT mark resolved when the prior finding\'s service was not in scannedServices (partial scan)', async () => {
    setupRuns({
      currentResults: [], // partial scan — IAM service didn't run this time
      priorResults: [
        makeResult({
          findingKey: 'iam-no-mfa-john',
          resourceId: 'john',
          passed: false,
          serviceId: 'iam',
        }),
      ],
      scannedServices: ['s3'], // only S3 ran this time
    });

    const service = new CloudReconciliationService(makeExceptionsStub());
    const result = await service.reconcile({ currentRunId: 'icr_current' });

    expect(result.resolutions).toBe(0);
    expect(dbMock.findingResolution.create).not.toHaveBeenCalled();
  });

  it('records a regression when a previously-resolved finding fails again', async () => {
    setupRuns({
      currentResults: [
        makeResult({ findingKey: 'iam-no-mfa-john', resourceId: 'john', passed: false }),
      ],
      priorResults: [
        // prior was passing — i.e. fix held, now broken again
        makeResult({ findingKey: 'iam-no-mfa-john', resourceId: 'john', passed: true }),
      ],
    });
    dbMock.findingResolution.findFirst
      .mockResolvedValueOnce(null) // idempotency probe
      .mockResolvedValueOnce({
        // last-resolved lookup
        id: 'fres_old',
        resolvedAt: PRIOR_RUN_TIME,
      });

    const service = new CloudReconciliationService(makeExceptionsStub());
    const result = await service.reconcile({ currentRunId: 'icr_current' });

    expect(result.regressions).toBe(1);
    expect(dbMock.findingRegression.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          checkId: 'iam-no-mfa',
          resourceId: 'john',
          previousResolutionId: 'fres_old',
        }),
      }),
    );
  });

  describe('scanMode safety — only diffs same-mode runs', () => {
    it('passes scanMode from current run into the prior-run lookup', async () => {
      // When SecHub mode is active, reconciliation must look up the prior
      // SecHub run — not the prior comp_scanners run, which would mark
      // every SecHub finding as "new" and every comp_scanners finding as
      // "resolved" (both wrong).
      dbMock.integrationCheckRun.findUnique.mockResolvedValueOnce({
        id: 'icr_current',
        connectionId: 'icn_aws',
        status: 'success',
        startedAt: CURRENT_RUN_TIME,
        completedAt: CURRENT_RUN_TIME,
        scannedServices: [],
        scanMode: 'security_hub',
        connection: { organizationId: 'org_1' },
        results: [],
      });
      dbMock.integrationCheckRun.findFirst.mockResolvedValueOnce(null);

      const service = new CloudReconciliationService(makeExceptionsStub());
      await service.reconcile({ currentRunId: 'icr_current' });

      // findFirst is called once: the prior-run lookup. Its where clause
      // MUST scope by the same scanMode as the current run.
      expect(dbMock.integrationCheckRun.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scanMode: 'security_hub' }),
        }),
      );
    });

    it('passes null scanMode for GCP / Azure runs so they reconcile against each other', async () => {
      // GCP / Azure runs have scanMode = null (no scan-mode concept). They
      // must reconcile against each other (null === null). AWS rows
      // ALWAYS have an explicit scanMode — pre-feature rows were
      // backfilled to 'comp_scanners' by the schema migration.
      dbMock.integrationCheckRun.findUnique.mockResolvedValueOnce({
        id: 'icr_current',
        connectionId: 'icn_gcp',
        status: 'success',
        startedAt: CURRENT_RUN_TIME,
        completedAt: CURRENT_RUN_TIME,
        scannedServices: [],
        scanMode: null,
        connection: { organizationId: 'org_1' },
        results: [],
      });
      dbMock.integrationCheckRun.findFirst.mockResolvedValueOnce(null);

      const service = new CloudReconciliationService(makeExceptionsStub());
      await service.reconcile({ currentRunId: 'icr_current' });

      expect(dbMock.integrationCheckRun.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scanMode: null }),
        }),
      );
    });

    it('reconciles comp_scanners runs against backfilled comp_scanners history (post-deploy continuity)', async () => {
      // After the deploy, every existing AWS customer's first scan should
      // continue diffing against their prior history seamlessly. The
      // migration backfills pre-feature AWS rows to 'comp_scanners', so
      // the new scan (also 'comp_scanners') finds matching prior runs.
      // Locks in that we DO NOT skip History events on the first post-
      // deploy scan for existing customers.
      setupRuns({
        currentResults: [
          makeResult({ findingKey: 'iam-no-mfa-john', resourceId: 'john', passed: true }),
        ],
        priorResults: [
          makeResult({ findingKey: 'iam-no-mfa-john', resourceId: 'john', passed: false }),
        ],
      });
      // Override findUnique to set scanMode explicitly on the current run.
      dbMock.integrationCheckRun.findUnique.mockReset();
      dbMock.integrationCheckRun.findUnique.mockResolvedValueOnce({
        id: 'icr_current',
        connectionId: 'icn_aws',
        status: 'success',
        startedAt: CURRENT_RUN_TIME,
        completedAt: CURRENT_RUN_TIME,
        scannedServices: [],
        scanMode: 'comp_scanners',
        connection: { organizationId: 'org_1' },
        results: [
          makeResult({ findingKey: 'iam-no-mfa-john', resourceId: 'john', passed: true }),
        ],
      });

      const service = new CloudReconciliationService(makeExceptionsStub());
      const result = await service.reconcile({ currentRunId: 'icr_current' });

      expect(dbMock.integrationCheckRun.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scanMode: 'comp_scanners' }),
        }),
      );
      // Resolution should still be detected — backfilled prior run had
      // scanMode='comp_scanners', matches the new run's scanMode.
      expect(result.resolutions).toBe(1);
    });

    it('returns 0/0 when no prior run of the same mode exists (post-switch baseline)', async () => {
      // After a customer switches modes, the next scan finds no matching
      // prior run and returns a clean baseline. This is the same code
      // path as a first-ever scan — confirmed here to lock in the
      // contract that mode switches are safe.
      dbMock.integrationCheckRun.findUnique.mockResolvedValueOnce({
        id: 'icr_current',
        connectionId: 'icn_aws',
        status: 'success',
        startedAt: CURRENT_RUN_TIME,
        completedAt: CURRENT_RUN_TIME,
        scannedServices: [],
        scanMode: 'security_hub',
        connection: { organizationId: 'org_1' },
        results: [],
      });
      // Simulate no prior SecHub run found (only comp_scanners runs exist).
      dbMock.integrationCheckRun.findFirst.mockResolvedValueOnce(null);

      const service = new CloudReconciliationService(makeExceptionsStub());
      const result = await service.reconcile({ currentRunId: 'icr_current' });

      expect(result).toEqual({ resolutions: 0, regressions: 0, skipped: false });
      expect(dbMock.findingResolution.create).not.toHaveBeenCalled();
      expect(dbMock.findingRegression.create).not.toHaveBeenCalled();
    });
  });
});
