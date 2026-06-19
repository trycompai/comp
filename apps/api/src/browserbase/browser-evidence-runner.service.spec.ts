import { BrowserEvidenceRunnerService } from './browser-evidence-runner.service';
import { executeBrowserEvidence } from './browser-evidence-execution';
import { BrowserbaseScreenshotService } from './browserbase-screenshot.service';
import { BrowserbaseSessionService } from './browserbase-session.service';
import type { BrowserCredentialVaultAdapter } from './credential-vault';

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

  it('blocks configured vault profiles when credentials cannot be resolved', async () => {
    const credentialVault: BrowserCredentialVaultAdapter = {
      resolveCredentialReference: jest.fn().mockResolvedValue(null),
    };
    const service = new BrowserEvidenceRunnerService(
      new BrowserbaseSessionService(),
      new BrowserbaseScreenshotService(),
      credentialVault,
    );

    const result = await service.executeEvidenceOnSession({
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

    expect(result.status).toBe('blocked');
    expect(result.failureCode).toBe('needs_user_action');
    expect(executeBrowserEvidence).not.toHaveBeenCalled();
    expect(credentialVault.resolveCredentialReference).toHaveBeenCalledWith({
      profileId: 'bap_1',
      provider: '1password',
      externalItemRef: 'op://vault/item',
      connectionId: 'conn_1',
    });
  });

  it('passes resolved vault credentials to the evidence execution contract', async () => {
    const credentials = { username: 'svc@example.com', password: 'secret' };
    const credentialVault: BrowserCredentialVaultAdapter = {
      resolveCredentialReference: jest.fn().mockResolvedValue(credentials),
    };
    jest.mocked(executeBrowserEvidence).mockResolvedValue({
      success: true,
      finalUrl: 'https://example.com/final',
      logs: [],
    });

    const service = new BrowserEvidenceRunnerService(
      new BrowserbaseSessionService(),
      new BrowserbaseScreenshotService(),
      credentialVault,
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
      },
      sessionId: 'sess_1',
    });

    const call = jest.mocked(executeBrowserEvidence).mock.calls[0];
    expect(call?.[0].input.credentialMaterial).toEqual(credentials);
  });
});
