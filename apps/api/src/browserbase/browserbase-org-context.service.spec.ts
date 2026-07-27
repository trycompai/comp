import { RequestTimeoutException } from '@nestjs/common';
import { db } from '@db';
import { BrowserbaseSessionService } from './browserbase-session.service';
import {
  BrowserbaseOrgContextService,
  PENDING_CONTEXT_ID,
} from './browserbase-org-context.service';

jest.mock('@db', () => ({
  db: {
    browserbaseContext: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe('BrowserbaseOrgContextService', () => {
  let sessions: BrowserbaseSessionService;
  let service: BrowserbaseOrgContextService;

  beforeEach(() => {
    jest.clearAllMocks();
    sessions = new BrowserbaseSessionService();
    jest
      .spyOn(sessions, 'createBrowserbaseContext')
      .mockResolvedValue('ctx_new');
    service = new BrowserbaseOrgContextService(sessions);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('throws a request timeout when pending context creation never resolves', async () => {
    jest.useFakeTimers();
    const now = new Date('2026-01-01T00:00:00.000Z');
    jest.setSystemTime(now);
    (db.browserbaseContext.findUnique as jest.Mock).mockResolvedValue({
      organizationId: 'org_1',
      contextId: PENDING_CONTEXT_ID,
      updatedAt: now,
    });

    const promise = service.getOrCreateOrgContext('org_1');
    const expectation = expect(promise).rejects.toBeInstanceOf(
      RequestTimeoutException,
    );
    await jest.advanceTimersByTimeAsync(10_500);

    await expectation;
    expect(db.browserbaseContext.updateMany).not.toHaveBeenCalled();
  });

  it('keeps one timeout budget when a missing context row restarts the wait path', async () => {
    jest.useFakeTimers();
    const now = new Date('2026-01-01T00:00:00.000Z');
    jest.setSystemTime(now);
    (db.browserbaseContext.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        organizationId: 'org_1',
        contextId: PENDING_CONTEXT_ID,
        updatedAt: now,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValue({
        organizationId: 'org_1',
        contextId: PENDING_CONTEXT_ID,
        updatedAt: now,
      });
    (db.browserbaseContext.create as jest.Mock).mockRejectedValue({
      code: 'P2002',
    });

    const promise = service.getOrCreateOrgContext('org_1');
    const expectation = expect(promise).rejects.toBeInstanceOf(
      RequestTimeoutException,
    );
    await jest.advanceTimersByTimeAsync(10_500);

    await expectation;
    expect(db.browserbaseContext.create).toHaveBeenCalledTimes(1);
  });

  it('claims and recovers stale pending context rows', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:02:00.000Z'));
    (db.browserbaseContext.findUnique as jest.Mock).mockResolvedValue({
      organizationId: 'org_1',
      contextId: PENDING_CONTEXT_ID,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    (db.browserbaseContext.updateMany as jest.Mock)
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });

    const result = await service.getOrCreateOrgContext('org_1');

    expect(result).toEqual({ contextId: 'ctx_new', isNew: true });
    expect(db.browserbaseContext.create).not.toHaveBeenCalled();
    expect(db.browserbaseContext.updateMany).toHaveBeenCalledTimes(2);
    expect(db.browserbaseContext.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org_1',
          contextId: PENDING_CONTEXT_ID,
          updatedAt: { lte: new Date('2026-01-01T00:01:00.000Z') },
        }),
        data: expect.objectContaining({
          contextId: expect.stringMatching(/^__PENDING__:/),
        }),
      }),
    );
    const claimId = (db.browserbaseContext.updateMany as jest.Mock).mock
      .calls[0][0].data.contextId;
    expect(db.browserbaseContext.updateMany).toHaveBeenNthCalledWith(2, {
      where: { organizationId: 'org_1', contextId: claimId },
      data: { contextId: 'ctx_new' },
    });
  });
});
