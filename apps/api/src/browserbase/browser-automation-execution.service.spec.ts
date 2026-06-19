import { db } from '@db';
import { BrowserAuthProfileService } from './browser-auth-profile.service';
import { BrowserAutomationExecutionService } from './browser-automation-execution.service';
import { BrowserEvidenceRunnerService } from './browser-evidence-runner.service';
import { BrowserbaseSessionService } from './browserbase-session.service';

jest.mock('@db', () => ({
  db: {
    $transaction: jest.fn(),
    browserAutomation: { findUnique: jest.fn() },
    browserAutomationRun: { update: jest.fn(), findUnique: jest.fn() },
  },
  Prisma: {
    TransactionIsolationLevel: { Serializable: 'Serializable' },
  },
}));

describe('BrowserAutomationExecutionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (db.$transaction as jest.Mock).mockImplementation(async (callback) =>
      callback({
        browserAutomationRun: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue({
            id: 'bar_1',
            automationId: 'bau_1',
            profileId: 'bap_1',
            startedAt: new Date('2026-06-19T12:00:00.000Z'),
          }),
        },
      }),
    );
    (db.browserAutomation.findUnique as jest.Mock).mockResolvedValue({
      id: 'bau_1',
      taskId: 'tsk_1',
      targetUrl: 'https://example.com',
      instruction: 'collect evidence',
      evaluationCriteria: null,
      task: { organizationId: 'org_1' },
    });
    (db.browserAutomationRun.update as jest.Mock).mockResolvedValue({
      id: 'bar_1',
    });
  });

  it('persists a failed terminal state when the runner throws', async () => {
    const sessions = new BrowserbaseSessionService();
    const profiles = new BrowserAuthProfileService(sessions);
    const runner = new BrowserEvidenceRunnerService(sessions);

    jest.spyOn(profiles, 'resolveProfileForTarget').mockResolvedValue({
      id: 'bap_1',
      organizationId: 'org_1',
      hostname: 'example.com',
      loginIdentity: '',
      displayName: 'example.com browser profile',
      contextId: 'ctx_1',
      status: 'verified',
      lastVerifiedAt: null,
      lastAuthCheckUrl: null,
      blockedReason: null,
      vaultProvider: null,
      vaultExternalItemRef: null,
      vaultConnectionId: null,
      createdAt: new Date('2026-06-19T12:00:00.000Z'),
      updatedAt: new Date('2026-06-19T12:00:00.000Z'),
    });
    jest
      .spyOn(runner, 'runEvidence')
      .mockRejectedValue(new Error('Target closed'));

    const service = new BrowserAutomationExecutionService(
      sessions,
      profiles,
      runner,
    );

    const response = await service.runBrowserAutomation('bau_1', 'org_1');

    expect(response.success).toBe(false);
    expect(response.failureCode).toBe('browser_session_lost');
    expect(db.browserAutomationRun.update).toHaveBeenCalledWith({
      where: { id: 'bar_1' },
      data: expect.objectContaining({
        status: 'failed',
        failureCode: 'browser_session_lost',
        failureStage: 'session',
      }),
    });
  });
});
