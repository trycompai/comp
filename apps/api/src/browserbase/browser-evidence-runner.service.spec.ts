import { BrowserEvidenceRunnerService } from './browser-evidence-runner.service';
import { executeBrowserEvidence } from './browser-evidence-execution';
import { BrowserbaseScreenshotService } from './browserbase-screenshot.service';
import { BrowserbaseSessionService } from './browserbase-session.service';

jest.mock('@db', () => ({
  db: {},
  Prisma: {},
}));

jest.mock('./browser-evidence-execution', () => ({
  executeBrowserEvidence: jest.fn(),
}));

jest.mock('@/app/s3', () => ({
  BUCKET_NAME: 'test-bucket',
  getSignedUrl: jest.fn(),
  s3Client: { send: jest.fn() },
}));

describe('BrowserEvidenceRunnerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('treats screenshot upload failures as non-fatal', async () => {
    const screenshots = new BrowserbaseScreenshotService();
    jest
      .spyOn(screenshots, 'uploadScreenshot')
      .mockRejectedValue(new Error('S3 unavailable'));

    jest.mocked(executeBrowserEvidence).mockResolvedValue({
      success: true,
      screenshot: 'base64-image',
      finalUrl: 'https://example.com/final',
      logs: [],
    });

    const service = new BrowserEvidenceRunnerService(
      new BrowserbaseSessionService(),
      screenshots,
    );

    const result = await service.executeEvidenceOnSession({
      organizationId: 'org_1',
      taskId: 'tsk_1',
      automationId: 'bau_1',
      runId: 'bar_1',
      targetUrl: 'https://example.com',
      instruction: 'collect evidence',
      profile: {
        id: 'bap_1',
        hostname: 'example.com',
        contextId: 'ctx_1',
      },
      sessionId: 'sess_1',
    });

    expect(result.status).toBe('completed');
    expect(result.screenshotKey).toBeUndefined();
    expect(result.logs).toEqual([
      expect.objectContaining({
        stage: 'upload',
        message: 'Screenshot upload failed; run completed without screenshot.',
      }),
    ]);
  });

  it('does not pass vault credential material into evidence execution', async () => {
    jest.mocked(executeBrowserEvidence).mockResolvedValue({
      success: true,
      finalUrl: 'https://example.com/final',
      logs: [],
    });

    const service = new BrowserEvidenceRunnerService(
      new BrowserbaseSessionService(),
      new BrowserbaseScreenshotService(),
    );

    await service.executeEvidenceOnSession({
      organizationId: 'org_1',
      automationId: 'bau_1',
      runId: 'bar_1',
      targetUrl: 'https://example.com',
      instruction: 'collect evidence',
      profile: {
        id: 'bap_1',
        hostname: 'example.com',
        contextId: 'ctx_1',
        vaultProvider: '1password',
        vaultExternalItemRef: 'op://vault/item',
        vaultConnectionId: 'conn_1',
      },
      sessionId: 'sess_1',
    });

    const call = jest.mocked(executeBrowserEvidence).mock.calls[0];
    expect(call?.[0].input).not.toHaveProperty('credentialMaterial');
  });
});
