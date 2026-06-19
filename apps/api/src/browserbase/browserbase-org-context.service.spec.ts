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
    (db.browserbaseContext.findUnique as jest.Mock).mockResolvedValue({
      organizationId: 'org_1',
      contextId: PENDING_CONTEXT_ID,
    });

    const promise = service.getOrCreateOrgContext('org_1');
    const expectation = expect(promise).rejects.toBeInstanceOf(
      RequestTimeoutException,
    );
    await jest.advanceTimersByTimeAsync(10_500);

    await expectation;
  });

  it('keeps one timeout budget when a missing context row restarts the wait path', async () => {
    jest.useFakeTimers();
    (db.browserbaseContext.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        organizationId: 'org_1',
        contextId: PENDING_CONTEXT_ID,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValue({
        organizationId: 'org_1',
        contextId: PENDING_CONTEXT_ID,
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
});
