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
      deleteMany: jest.fn(),
    },
    browserbaseContext: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
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
});
