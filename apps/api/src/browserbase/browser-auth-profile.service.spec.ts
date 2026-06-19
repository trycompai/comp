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
    },
    browserbaseContext: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
    jest.spyOn(sessions, 'createBrowserbaseContext').mockResolvedValue('ctx_new');
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
        contextId: 'ctx_new',
      }),
    });
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
});
