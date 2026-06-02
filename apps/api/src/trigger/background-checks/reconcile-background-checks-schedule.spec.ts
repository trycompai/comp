import { db } from '@db';
import {
  parseIdentityCheckState,
  runReconciliation,
} from './reconcile-background-checks-schedule';

// Mock @db at the module boundary so importing the task does not connect to
// Postgres.
jest.mock('@db', () => ({
  db: {
    backgroundCheckRequest: { findMany: jest.fn(), update: jest.fn() },
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
const update = mockedDb.backgroundCheckRequest.update as jest.Mock;

const payload = { timestamp: new Date('2026-06-02T12:00:00.000Z') };

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

  it('tolerates extra fields and a missing statuses object', () => {
    const result = parseIdentityCheckState({
      status: 'in_review',
      report: { identity: { foo: 'bar' } },
    });
    expect(result.status).toBe('in_review');
    expect(result.statuses).toBeUndefined();
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
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('skips entirely when the API key is not configured', async () => {
    delete process.env.BACKGROUND_CHECK_API_KEY;
    const result = await runReconciliation(payload);
    expect(findMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      checked: 0,
      updated: 0,
      unparseable: 0,
    });
  });

  it('applies a newly-reported status (and report snapshot) to a stuck check', async () => {
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

    const result = await runReconciliation(payload);

    expect(update).toHaveBeenCalledWith({
      where: { id: 'bcr_1' },
      data: expect.objectContaining({
        status: 'completed',
        identityStatus: 'passed',
        employmentStatus: 'verified',
        reportSnapshot: { report: 'x' },
        reportSyncedAt: expect.any(Date),
      }),
    });
    expect(result).toEqual({
      success: true,
      checked: 1,
      updated: 1,
      unparseable: 0,
    });
  });

  it('only bumps lastSyncedAt when the status has not changed', async () => {
    findMany.mockResolvedValue([
      {
        id: 'bcr_1',
        identityBackgroundCheckId: 'check_1',
        status: 'in_progress',
      },
    ]);
    mockGetBackgroundCheck.mockResolvedValue({ status: 'in_progress' });

    const result = await runReconciliation(payload);

    expect(update).toHaveBeenCalledWith({
      where: { id: 'bcr_1' },
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

    const result = await runReconciliation(payload);

    expect(update).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      checked: 1,
      updated: 0,
      unparseable: 1,
    });
  });

  it('queries only stale, non-terminal checks with an Identity id', async () => {
    findMany.mockResolvedValue([]);
    await runReconciliation(payload);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        status: { in: ['invited', 'in_progress', 'in_review'] },
        identityBackgroundCheckId: { not: null },
        OR: [
          { lastSyncedAt: null },
          { lastSyncedAt: { lt: new Date('2026-06-02T11:00:00.000Z') } },
        ],
      },
      select: { id: true, identityBackgroundCheckId: true, status: true },
    });
  });
});
