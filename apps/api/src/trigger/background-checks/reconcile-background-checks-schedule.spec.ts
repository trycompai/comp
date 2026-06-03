import { db } from '@db';
import {
  parseIdentityCheckState,
  runReconciliation,
} from './reconcile-background-checks-schedule';

// Mock @db at the module boundary so importing the task does not connect to
// Postgres.
jest.mock('@db', () => ({
  db: {
    backgroundCheckRequest: { findMany: jest.fn(), updateMany: jest.fn() },
  },
  BackgroundCheckStatus: {
    invited: 'invited',
    in_progress: 'in_progress',
    in_review: 'in_review',
    completed: 'completed',
    completed_with_flags: 'completed_with_flags',
    failed: 'failed',
    cancelled: 'cancelled',
  },
  Prisma: {},
}));

jest.mock('@trigger.dev/sdk', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  schedules: { task: (config: unknown) => config },
}));

const mockGetBackgroundCheck = jest.fn();
jest.mock('../../background-checks/background-check-identity.client', () => ({
  BackgroundCheckIdentityClient: jest.fn().mockImplementation(() => ({
    getBackgroundCheck: mockGetBackgroundCheck,
  })),
}));

const mockFetchSnapshot = jest.fn();
jest.mock('../../background-checks/background-check-report-snapshot', () => ({
  fetchCompletedReportSnapshot: (...args: unknown[]) =>
    mockFetchSnapshot(...args),
}));

const mockedDb = db as jest.Mocked<typeof db>;
const findMany = mockedDb.backgroundCheckRequest.findMany as jest.Mock;
const updateMany = mockedDb.backgroundCheckRequest.updateMany as jest.Mock;

const NON_TERMINAL = ['invited', 'in_progress', 'in_review'];

describe('parseIdentityCheckState', () => {
  it('extracts status and sub-statuses from a well-formed response', () => {
    const result = parseIdentityCheckState({
      status: 'completed',
      statuses: { identity: 'passed', employment: 'verified' },
    });
    expect(result.status).toBe('completed');
    expect(result.statuses).toEqual({
      identity: 'passed',
      employment: 'verified',
    });
  });

  it('returns no status when the field is absent', () => {
    expect(parseIdentityCheckState({ id: 'check_1' }).status).toBeUndefined();
  });

  it('returns no status when the value is not a known status', () => {
    expect(
      parseIdentityCheckState({ status: 'totally_made_up' }).status,
    ).toBeUndefined();
  });

  it('keeps a valid status even when the statuses object is malformed', () => {
    const garbage = parseIdentityCheckState({
      status: 'completed',
      statuses: 'not-an-object',
    });
    expect(garbage.status).toBe('completed');
    expect(garbage.statuses).toBeUndefined();

    const badField = parseIdentityCheckState({
      status: 'in_review',
      statuses: { identity: 123 },
    });
    expect(badField.status).toBe('in_review');
    expect(badField.statuses).toBeUndefined();
  });

  it('returns nothing for non-object input', () => {
    expect(parseIdentityCheckState(null).status).toBeUndefined();
    expect(parseIdentityCheckState('nope').status).toBeUndefined();
  });
});

describe('runReconciliation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, BACKGROUND_CHECK_API_KEY: 'bc_test' };
    mockFetchSnapshot.mockResolvedValue(null);
    updateMany.mockResolvedValue({ count: 1 });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('skips entirely when the API key is not configured', async () => {
    delete process.env.BACKGROUND_CHECK_API_KEY;
    const result = await runReconciliation();
    expect(findMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      checked: 0,
      updated: 0,
      unparseable: 0,
    });
  });

  it('applies a newly-reported status (and report snapshot) guarded on non-terminal state', async () => {
    findMany.mockResolvedValue([
      {
        id: 'bcr_1',
        identityBackgroundCheckId: 'check_1',
        status: 'in_progress',
      },
    ]);
    mockGetBackgroundCheck.mockResolvedValue({
      status: 'completed',
      statuses: { identity: 'passed', employment: 'verified' },
    });
    mockFetchSnapshot.mockResolvedValue({ report: 'x' });

    const result = await runReconciliation();

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'bcr_1', status: { in: NON_TERMINAL } },
      data: expect.objectContaining({
        status: 'completed',
        identityStatus: 'passed',
        employmentStatus: 'verified',
        reportSnapshot: { report: 'x' },
        reportSyncedAt: expect.any(Date),
      }),
    });
    expect(result.updated).toBe(1);
  });

  it('refreshes a changed sub-status even when the top-level status is unchanged', async () => {
    findMany.mockResolvedValue([
      {
        id: 'bcr_1',
        identityBackgroundCheckId: 'check_1',
        status: 'in_progress',
        identityStatus: 'pending',
      },
    ]);
    mockGetBackgroundCheck.mockResolvedValue({
      status: 'in_progress',
      statuses: { identity: 'passed' },
    });

    const result = await runReconciliation();

    const call = updateMany.mock.calls[0][0];
    expect(call.data).toMatchObject({ identityStatus: 'passed' });
    expect(call.data).not.toHaveProperty('status');
    expect(result.updated).toBe(1);
  });

  it('only bumps lastSyncedAt when nothing changed', async () => {
    findMany.mockResolvedValue([
      {
        id: 'bcr_1',
        identityBackgroundCheckId: 'check_1',
        status: 'in_progress',
      },
    ]);
    mockGetBackgroundCheck.mockResolvedValue({ status: 'in_progress' });

    const result = await runReconciliation();

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'bcr_1', status: { in: NON_TERMINAL } },
      data: { lastSyncedAt: expect.any(Date) },
    });
    expect(result.updated).toBe(0);
  });

  it('counts checks whose Identity status cannot be determined and leaves them untouched', async () => {
    findMany.mockResolvedValue([
      {
        id: 'bcr_1',
        identityBackgroundCheckId: 'check_1',
        status: 'in_progress',
      },
    ]);
    mockGetBackgroundCheck.mockResolvedValue({ id: 'check_1' });

    const result = await runReconciliation();

    expect(updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      checked: 1,
      updated: 0,
      unparseable: 1,
    });
  });

  it('queries only stale, non-terminal checks with an Identity id', async () => {
    findMany.mockResolvedValue([]);
    await runReconciliation();
    expect(findMany).toHaveBeenCalledWith({
      where: {
        status: { in: NON_TERMINAL },
        identityBackgroundCheckId: { not: null },
        OR: [
          { lastSyncedAt: null },
          { lastSyncedAt: { lt: expect.any(Date) } },
        ],
      },
      select: {
        id: true,
        identityBackgroundCheckId: true,
        status: true,
        identityStatus: true,
        employmentStatus: true,
        referenceStatus: true,
        rightToWorkStatus: true,
        adjudicationStatus: true,
      },
    });
  });
});
