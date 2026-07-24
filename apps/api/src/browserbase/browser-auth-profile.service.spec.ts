import { ForbiddenException } from '@nestjs/common';
import { BrowserbaseSessionService } from './browserbase-session.service';
import { BrowserAuthProfileService } from './browser-auth-profile.service';

jest.mock('@db', () => ({
  db: {
    browserAuthProfile: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    browserbaseContext: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    browserAutomation: {
      findMany: jest.fn(),
    },
  },
}));

import { db } from '@db';

describe('BrowserAuthProfileService', () => {
  let sessions: BrowserbaseSessionService;
  let service: BrowserAuthProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    sessions = new BrowserbaseSessionService();
    jest
      .spyOn(sessions, 'createBrowserbaseContext')
      .mockResolvedValue('ctx_new');
    service = new BrowserAuthProfileService(sessions);
  });

  describe('tenant guards (cross-org IDOR)', () => {
    it('assertContextOwnedByOrg passes when a profile in the org owns the context', async () => {
      (db.browserAuthProfile.findFirst as jest.Mock).mockResolvedValue({ id: 'bap_1' });
      (db.browserbaseContext.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.assertContextOwnedByOrg({ organizationId: 'org_1', contextId: 'ctx_1' }),
      ).resolves.toBeUndefined();
    });

    it('assertContextOwnedByOrg passes when the org-level context row owns it', async () => {
      (db.browserAuthProfile.findFirst as jest.Mock).mockResolvedValue(null);
      (db.browserbaseContext.findFirst as jest.Mock).mockResolvedValue({ id: 'bbc_1' });
      await expect(
        service.assertContextOwnedByOrg({ organizationId: 'org_1', contextId: 'ctx_1' }),
      ).resolves.toBeUndefined();
    });

    it('assertContextOwnedByOrg rejects a context that belongs to another org', async () => {
      (db.browserAuthProfile.findFirst as jest.Mock).mockResolvedValue(null);
      (db.browserbaseContext.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.assertContextOwnedByOrg({ organizationId: 'org_1', contextId: 'ctx_other' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('assertSessionOwnedByOrg returns the contextId when the org owns the session', async () => {
      jest.spyOn(sessions, 'getSessionContextId').mockResolvedValue('ctx_1');
      (db.browserAuthProfile.findFirst as jest.Mock).mockResolvedValue({ id: 'bap_1' });
      (db.browserbaseContext.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.assertSessionOwnedByOrg({ organizationId: 'org_1', sessionId: 'sess_1' }),
      ).resolves.toBe('ctx_1');
    });

    it('assertSessionOwnedByOrg rejects a session whose context is another org', async () => {
      jest.spyOn(sessions, 'getSessionContextId').mockResolvedValue('ctx_other');
      (db.browserAuthProfile.findFirst as jest.Mock).mockResolvedValue(null);
      (db.browserbaseContext.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.assertSessionOwnedByOrg({ organizationId: 'org_1', sessionId: 'sess_x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('assertSessionOwnedByOrg rejects when the session context cannot be resolved', async () => {
      jest.spyOn(sessions, 'getSessionContextId').mockResolvedValue(undefined);
      await expect(
        service.assertSessionOwnedByOrg({ organizationId: 'org_1', sessionId: 'gone' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  it('normalizes hostname and login identity when creating a profile', async () => {
    (db.browserAuthProfile.findUnique as jest.Mock).mockResolvedValue(null);
    (db.browserbaseContext.findUnique as jest.Mock).mockResolvedValue(null);
    (db.browserAuthProfile.create as jest.Mock).mockResolvedValue({
      id: 'bap_1',
      organizationId: 'org_1',
      hostname: 'github.com',
      loginIdentity: 'svc@example.com',
      contextId: '__PENDING__',
    });
    (db.browserAuthProfile.update as jest.Mock).mockResolvedValue({
      id: 'bap_1',
      organizationId: 'org_1',
      hostname: 'github.com',
      loginIdentity: 'svc@example.com',
      contextId: 'ctx_new',
    });

    await service.getOrCreateProfileFromUrl({
      organizationId: 'org_1',
      url: 'https://GitHub.com/acme/repo',
      loginIdentity: ' SVC@EXAMPLE.COM ',
    });

    expect(db.browserAuthProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org_1',
        hostname: 'github.com',
        loginIdentity: 'svc@example.com',
        contextId: '__PENDING__',
      }),
    });
    expect(db.browserAuthProfile.update).toHaveBeenCalledWith({
      where: { id: 'bap_1' },
      data: { contextId: 'ctx_new' },
    });
  });

  it('does not create an orphan context when another request creates the profile', async () => {
    (db.browserAuthProfile.findUnique as jest.Mock).mockResolvedValue(null);
    (db.browserAuthProfile.create as jest.Mock).mockRejectedValue({
      code: 'P2002',
    });
    (db.browserAuthProfile.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: 'bap_existing',
      organizationId: 'org_1',
      hostname: 'github.com',
      loginIdentity: '',
      contextId: 'ctx_existing',
    });

    const result = await service.getOrCreateProfileFromUrl({
      organizationId: 'org_1',
      url: 'https://github.com/acme/repo',
    });

    expect(result.profile.id).toBe('bap_existing');
    expect(sessions.createBrowserbaseContext).not.toHaveBeenCalled();
  });

  it('prioritizes a verified profile for the target hostname', async () => {
    (db.browserAuthProfile.findMany as jest.Mock).mockResolvedValue([
      { id: 'bap_old', status: 'needs_reauth', hostname: 'github.com' },
      { id: 'bap_verified', status: 'verified', hostname: 'github.com' },
    ]);

    const profile = await service.resolveProfileForTarget({
      organizationId: 'org_1',
      targetUrl: 'https://github.com/acme/repo',
    });

    expect(profile.id).toBe('bap_verified');
    expect(db.browserAuthProfile.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', hostname: 'github.com' },
      orderBy: { updatedAt: 'desc' },
    });
  });

  it('rejects profile verification for a different hostname', async () => {
    jest
      .spyOn(sessions, 'checkLoginStatus')
      .mockResolvedValue({ isLoggedIn: true });
    (db.browserAuthProfile.findFirst as jest.Mock).mockResolvedValue({
      id: 'bap_1',
      organizationId: 'org_1',
      hostname: 'github.com',
      lastVerifiedAt: null,
    });

    await expect(
      service.verifyProfileSession({
        organizationId: 'org_1',
        profileId: 'bap_1',
        sessionId: 'sess_1',
        url: 'https://gitlab.com/acme/repo',
      }),
    ).rejects.toThrow('Verification URL must match');
    expect(sessions.checkLoginStatus).not.toHaveBeenCalled();
  });

  it('rejects profile verification when the session uses another context', async () => {
    jest.spyOn(sessions, 'getSessionContextId').mockResolvedValue('ctx_other');
    jest
      .spyOn(sessions, 'checkLoginStatus')
      .mockResolvedValue({ isLoggedIn: true });
    (db.browserAuthProfile.findFirst as jest.Mock).mockResolvedValue({
      id: 'bap_1',
      organizationId: 'org_1',
      hostname: 'github.com',
      contextId: 'ctx_profile',
      lastVerifiedAt: null,
    });

    await expect(
      service.verifyProfileSession({
        organizationId: 'org_1',
        profileId: 'bap_1',
        sessionId: 'sess_wrong',
        url: 'https://github.com/acme/repo',
      }),
    ).rejects.toThrow('does not belong to this auth profile');
    expect(sessions.checkLoginStatus).not.toHaveBeenCalled();
    expect(db.browserAuthProfile.update).not.toHaveBeenCalled();
  });

  it('treats a pending legacy org context as unavailable', async () => {
    (db.browserbaseContext.findUnique as jest.Mock).mockResolvedValue({
      organizationId: 'org_1',
      contextId: '__PENDING__',
    });

    await expect(service.getOrgContext('org_1')).resolves.toBeNull();
  });

  it('clears pending org context when Browserbase context creation fails', async () => {
    (db.browserbaseContext.findUnique as jest.Mock).mockResolvedValue(null);
    (db.browserbaseContext.create as jest.Mock).mockResolvedValue({
      organizationId: 'org_1',
      contextId: '__PENDING__',
    });
    jest
      .spyOn(sessions, 'createBrowserbaseContext')
      .mockRejectedValue(new Error('Browserbase unavailable'));

    await expect(service.getOrCreateOrgContext('org_1')).rejects.toThrow(
      'Browserbase unavailable',
    );
    expect(db.browserbaseContext.deleteMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1', contextId: '__PENDING__' },
    });
  });

  describe('listProfiles', () => {
    it('attaches an automation count per connection by hostname', async () => {
      (db.browserAuthProfile.findMany as jest.Mock).mockResolvedValue([
        { id: 'bap_gh', organizationId: 'org_1', hostname: 'github.com' },
        { id: 'bap_aws', organizationId: 'org_1', hostname: 'aws.amazon.com' },
        { id: 'bap_dd', organizationId: 'org_1', hostname: 'datadoghq.com' },
      ]);
      (db.browserAutomation.findMany as jest.Mock).mockResolvedValue([
        { targetUrl: 'https://github.com/acme/repo' },
        { targetUrl: 'https://github.com/acme/other' },
        { targetUrl: 'https://aws.amazon.com/console' },
        { targetUrl: 'not-a-url' }, // malformed -> skipped, not fatal
      ]);

      const result = await service.listProfiles('org_1');

      expect(db.browserAutomation.findMany).toHaveBeenCalledWith({
        where: { task: { organizationId: 'org_1' } },
        select: { targetUrl: true },
      });
      expect(result.find((p) => p.id === 'bap_gh')?.automationCount).toBe(2);
      expect(result.find((p) => p.id === 'bap_aws')?.automationCount).toBe(1);
      expect(result.find((p) => p.id === 'bap_dd')?.automationCount).toBe(0);
    });
  });

  describe('updateProfile / deleteProfile', () => {
    const existing = {
      id: 'bap_1',
      organizationId: 'org_1',
      hostname: 'app.example.com',
      displayName: 'Example',
      status: 'verified',
    };

    beforeEach(() => {
      (db.browserAuthProfile.update as jest.Mock).mockImplementation(
        ({ data }) => ({ ...existing, ...data }),
      );
      (db.browserAuthProfile.delete as jest.Mock).mockResolvedValue(existing);
    });

    it('updates only the display name (trimmed)', async () => {
      (db.browserAuthProfile.findFirst as jest.Mock).mockResolvedValue(existing);
      await service.updateProfile({
        organizationId: 'org_1',
        profileId: 'bap_1',
        displayName: '  New name  ',
      });
      expect(db.browserAuthProfile.update).toHaveBeenCalledWith({
        where: { id: 'bap_1' },
        data: { displayName: 'New name' },
      });
    });

    it('keeps the connection signed in when the URL stays on the same host', async () => {
      (db.browserAuthProfile.findFirst as jest.Mock).mockResolvedValue(existing);
      await service.updateProfile({
        organizationId: 'org_1',
        profileId: 'bap_1',
        url: 'https://app.example.com/account/login',
      });
      const data = (db.browserAuthProfile.update as jest.Mock).mock.calls[0][0]
        .data;
      expect(data.lastAuthCheckUrl).toBe(
        'https://app.example.com/account/login',
      );
      expect(data.status).toBeUndefined();
    });

    it('marks needs_reauth when the URL moves to a different host', async () => {
      (db.browserAuthProfile.findFirst as jest.Mock).mockResolvedValue(existing);
      await service.updateProfile({
        organizationId: 'org_1',
        profileId: 'bap_1',
        url: 'https://other.com/login',
      });
      const data = (db.browserAuthProfile.update as jest.Mock).mock.calls[0][0]
        .data;
      expect(data.status).toBe('needs_reauth');
    });

    it('deletes the profile', async () => {
      (db.browserAuthProfile.findFirst as jest.Mock).mockResolvedValue(existing);
      const result = await service.deleteProfile({
        organizationId: 'org_1',
        profileId: 'bap_1',
      });
      expect(db.browserAuthProfile.delete).toHaveBeenCalledWith({
        where: { id: 'bap_1' },
      });
      expect(result.success).toBe(true);
    });

    it('throws when updating a missing profile', async () => {
      (db.browserAuthProfile.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.updateProfile({
          organizationId: 'org_1',
          profileId: 'nope',
          displayName: 'x',
        }),
      ).rejects.toThrow('not found');
    });
  });
});
