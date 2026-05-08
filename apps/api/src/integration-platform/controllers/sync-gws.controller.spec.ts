import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from './sync.controller';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { ConnectionRepository } from '../repositories/connection.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { IntegrationSyncLoggerService } from '../services/integration-sync-logger.service';
import { db } from '@db';

jest.mock('@db', () => ({
  db: {
    integrationProvider: { findUnique: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn() },
    member: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: { integration: ['create', 'read', 'update', 'delete'] },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

jest.mock('@trycompai/integration-platform', () => {
  const actual = jest.requireActual<
    typeof import('@trycompai/integration-platform')
  >('@trycompai/integration-platform');
  return {
    ...actual,
    getManifest: jest.fn().mockReturnValue({
      auth: { type: 'oauth2', config: { tokenUrl: '', refreshUrl: '' } },
    }),
    TASK_TEMPLATE_INFO: {},
  };
});

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockedDb = db as jest.Mocked<typeof db>;

interface GwUser {
  primaryEmail: string;
  name: { fullName: string };
  suspended?: boolean;
  orgUnitPath?: string;
}

interface MockMember {
  id: string;
  userId: string;
  organizationId: string;
  deactivated: boolean;
  isActive: boolean;
  role: string;
  user: { email: string };
}

describe('SyncController - Google Workspace employees', () => {
  let controller: SyncController;
  let mockConnectionRepo: jest.Mocked<ConnectionRepository>;
  let mockCredentialVault: jest.Mocked<CredentialVaultService>;
  let mockOAuthCredentials: jest.Mocked<OAuthCredentialsService>;

  const orgId = 'org_test123';
  const connectionId = 'conn_test123';

  beforeEach(async () => {
    mockConnectionRepo = {
      findById: jest.fn(),
      findBySlugAndOrg: jest.fn(),
    } as unknown as jest.Mocked<ConnectionRepository>;

    mockCredentialVault = {
      getDecryptedCredentials: jest.fn(),
      refreshOAuthTokens: jest.fn(),
    } as unknown as jest.Mocked<CredentialVaultService>;

    mockOAuthCredentials = {
      getCredentials: jest.fn(),
    } as unknown as jest.Mocked<OAuthCredentialsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        { provide: ConnectionRepository, useValue: mockConnectionRepo },
        { provide: CredentialVaultService, useValue: mockCredentialVault },
        { provide: OAuthCredentialsService, useValue: mockOAuthCredentials },
        {
          provide: IntegrationSyncLoggerService,
          useValue: { logSync: jest.fn() },
        },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SyncController>(SyncController);
    jest.clearAllMocks();
  });

  function setupSync({
    gwUsers,
    variables = {},
  }: {
    gwUsers: GwUser[];
    variables?: Record<string, unknown>;
  }) {
    mockConnectionRepo.findById.mockResolvedValue({
      id: connectionId,
      organizationId: orgId,
      providerId: 'prov_1',
      variables,
    } as never);

    (mockedDb.integrationProvider.findUnique as jest.Mock).mockResolvedValue({
      id: 'prov_1',
      slug: 'google-workspace',
    });

    mockCredentialVault.getDecryptedCredentials.mockResolvedValue({
      access_token: 'test-token',
      refresh_token: 'test-refresh',
    });

    mockOAuthCredentials.getCredentials.mockResolvedValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
    });

    mockCredentialVault.refreshOAuthTokens.mockResolvedValue('new-token');

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ users: gwUsers }),
    });
  }

  function makeGwUser(
    email: string,
    opts: { suspended?: boolean; orgUnitPath?: string } = {},
  ): GwUser {
    return {
      primaryEmail: email,
      name: { fullName: email.split('@')[0] },
      suspended: opts.suspended ?? false,
      orgUnitPath: opts.orgUnitPath ?? '/',
    };
  }

  function makeMember(
    email: string,
    opts: {
      id?: string;
      userId?: string;
      deactivated?: boolean;
      role?: string;
    } = {},
  ): MockMember {
    const id = opts.id ?? `mem_${email.split('@')[0]}`;
    return {
      id,
      userId: opts.userId ?? `user_${email.split('@')[0]}`,
      organizationId: orgId,
      deactivated: opts.deactivated ?? false,
      isActive: !(opts.deactivated ?? false),
      role: opts.role ?? 'employee',
      user: { email },
    };
  }

  // ── Import & Skip ──────────────────────────────────────────────

  describe('importing new users', () => {
    it('should import a user with no existing member record', async () => {
      setupSync({ gwUsers: [makeGwUser('new@example.com')] });

      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedDb.user.create as jest.Mock).mockResolvedValue({
        id: 'user_new',
        email: 'new@example.com',
      });
      (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedDb.member.create as jest.Mock).mockResolvedValue({
        id: 'mem_new',
      });
      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      expect(result.imported).toBe(1);
      expect(result.reactivated).toBe(0);
      expect(mockedDb.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: 'new@example.com' }),
      });
      expect(mockedDb.member.create).toHaveBeenCalledWith({
        data: {
          organizationId: orgId,
          userId: 'user_new',
          role: 'employee',
          isActive: true,
        },
      });
    });

    it('should use existing user record when user already exists', async () => {
      setupSync({ gwUsers: [makeGwUser('existing@example.com')] });

      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_existing',
        email: 'existing@example.com',
      });
      (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedDb.member.create as jest.Mock).mockResolvedValue({
        id: 'mem_existing',
      });
      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      expect(result.imported).toBe(1);
      expect(mockedDb.user.create).not.toHaveBeenCalled();
    });

    it('should skip active existing members', async () => {
      setupSync({ gwUsers: [makeGwUser('active@example.com')] });

      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_active',
        email: 'active@example.com',
      });
      (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(
        makeMember('active@example.com', { userId: 'user_active' }),
      );
      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      expect(result.skipped).toBe(1);
      expect(result.imported).toBe(0);
      expect(result.reactivated).toBe(0);
      expect(mockedDb.member.create).not.toHaveBeenCalled();
      expect(mockedDb.member.update).not.toHaveBeenCalled();
    });
  });

  // ── Deactivated members must NOT be reactivated ────────────────

  describe('deactivated member handling (no reactivation)', () => {
    it('should NOT reactivate a member deactivated manually by an admin', async () => {
      setupSync({ gwUsers: [makeGwUser('manual@example.com')] });

      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_manual',
        email: 'manual@example.com',
      });
      (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(
        makeMember('manual@example.com', {
          userId: 'user_manual',
          deactivated: true,
        }),
      );
      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      expect(result.reactivated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockedDb.member.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deactivated: false }),
        }),
      );
    });

    it('should NOT reactivate a member previously deactivated by sync', async () => {
      setupSync({ gwUsers: [makeGwUser('synced@example.com')] });

      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_synced',
        email: 'synced@example.com',
      });
      (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(
        makeMember('synced@example.com', {
          userId: 'user_synced',
          deactivated: true,
        }),
      );
      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      expect(result.reactivated).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should report correct skip reason for deactivated members', async () => {
      setupSync({ gwUsers: [makeGwUser('deact@example.com')] });

      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_deact',
        email: 'deact@example.com',
      });
      (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(
        makeMember('deact@example.com', {
          userId: 'user_deact',
          deactivated: true,
        }),
      );
      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      const detail = result.details.find(
        (d) => d.email === 'deact@example.com',
      );
      expect(detail).toEqual({
        email: 'deact@example.com',
        status: 'skipped',
        reason: 'Member is deactivated',
      });
    });

    it('should report correct skip reason for active existing members', async () => {
      setupSync({ gwUsers: [makeGwUser('already@example.com')] });

      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_already',
        email: 'already@example.com',
      });
      (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(
        makeMember('already@example.com', {
          userId: 'user_already',
          deactivated: false,
        }),
      );
      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      const detail = result.details.find(
        (d) => d.email === 'already@example.com',
      );
      expect(detail).toEqual({
        email: 'already@example.com',
        status: 'skipped',
        reason: 'Already a member',
      });
    });
  });

  // ── Deactivation pass ──────────────────────────────────────────

  describe('deactivation of suspended/deleted users', () => {
    it('should deactivate members who are suspended in Google Workspace', async () => {
      setupSync({
        gwUsers: [makeGwUser('sus@example.com', { suspended: true })],
      });

      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([
        makeMember('sus@example.com'),
      ]);
      (mockedDb.member.update as jest.Mock).mockResolvedValue({});

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      expect(result.deactivated).toBe(1);
      expect(mockedDb.member.update).toHaveBeenCalledWith({
        where: { id: 'mem_sus' },
        data: { deactivated: true, isActive: false },
      });
      const detail = result.details.find((d) => d.email === 'sus@example.com');
      expect(detail?.reason).toBe('User is suspended in Google Workspace');
    });

    it('should deactivate members deleted from Google Workspace', async () => {
      // GWS returns one active user but the org also has a member
      // whose email is no longer in GWS — they were deleted
      setupSync({ gwUsers: [makeGwUser('still-active@example.com')] });

      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_still',
        email: 'still-active@example.com',
      });
      (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(
        makeMember('still-active@example.com', { userId: 'user_still' }),
      );

      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([
        makeMember('still-active@example.com'),
        makeMember('deleted@example.com'),
      ]);
      (mockedDb.member.update as jest.Mock).mockResolvedValue({});

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      expect(result.deactivated).toBe(1);
      const detail = result.details.find(
        (d) => d.email === 'deleted@example.com',
      );
      expect(detail?.reason).toBe('User was removed from Google Workspace');
    });

    it('should NOT deactivate privileged members (owner)', async () => {
      // Need a GWS user on the same domain so the domain check passes
      // and the role guard is actually exercised
      setupSync({ gwUsers: [makeGwUser('active@example.com')] });

      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_active',
        email: 'active@example.com',
      });
      (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(
        makeMember('active@example.com', { userId: 'user_active' }),
      );

      // Owner is not in GWS active list — would be deactivated if not privileged
      // Include an unprivileged member to prove deactivation works for non-privileged
      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([
        makeMember('active@example.com'),
        makeMember('owner@example.com', { role: 'owner' }),
        makeMember('gone@example.com', { role: 'employee' }),
      ]);
      (mockedDb.member.update as jest.Mock).mockResolvedValue({});

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      // gone@ gets deactivated, owner@ does not
      expect(result.deactivated).toBe(1);
      const deactivatedEmails = result.details
        .filter((d) => d.status === 'deactivated')
        .map((d) => d.email);
      expect(deactivatedEmails).toContain('gone@example.com');
      expect(deactivatedEmails).not.toContain('owner@example.com');
    });

    it('should NOT deactivate privileged members (admin)', async () => {
      setupSync({ gwUsers: [makeGwUser('active@example.com')] });

      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_active',
        email: 'active@example.com',
      });
      (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(
        makeMember('active@example.com', { userId: 'user_active' }),
      );

      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([
        makeMember('active@example.com'),
        makeMember('admin@example.com', { role: 'admin' }),
        makeMember('gone@example.com', { role: 'employee' }),
      ]);
      (mockedDb.member.update as jest.Mock).mockResolvedValue({});

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      expect(result.deactivated).toBe(1);
      const deactivatedEmails = result.details
        .filter((d) => d.status === 'deactivated')
        .map((d) => d.email);
      expect(deactivatedEmails).toContain('gone@example.com');
      expect(deactivatedEmails).not.toContain('admin@example.com');
    });

    it('should NOT deactivate privileged members (auditor)', async () => {
      setupSync({ gwUsers: [makeGwUser('active@example.com')] });

      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_active',
        email: 'active@example.com',
      });
      (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(
        makeMember('active@example.com', { userId: 'user_active' }),
      );

      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([
        makeMember('active@example.com'),
        makeMember('auditor@example.com', { role: 'auditor' }),
        makeMember('gone@example.com', { role: 'employee' }),
      ]);
      (mockedDb.member.update as jest.Mock).mockResolvedValue({});

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      expect(result.deactivated).toBe(1);
      const deactivatedEmails = result.details
        .filter((d) => d.status === 'deactivated')
        .map((d) => d.email);
      expect(deactivatedEmails).toContain('gone@example.com');
      expect(deactivatedEmails).not.toContain('auditor@example.com');
    });

    it('should NOT deactivate members with comma-separated roles including a privileged role', async () => {
      setupSync({ gwUsers: [makeGwUser('active@example.com')] });

      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_active',
        email: 'active@example.com',
      });
      (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(
        makeMember('active@example.com', { userId: 'user_active' }),
      );

      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([
        makeMember('active@example.com'),
        makeMember('multi@example.com', { role: 'employee,admin' }),
        makeMember('gone@example.com', { role: 'employee' }),
      ]);
      (mockedDb.member.update as jest.Mock).mockResolvedValue({});

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      expect(result.deactivated).toBe(1);
      const deactivatedEmails = result.details
        .filter((d) => d.status === 'deactivated')
        .map((d) => d.email);
      expect(deactivatedEmails).toContain('gone@example.com');
      expect(deactivatedEmails).not.toContain('multi@example.com');
    });

    it('should NOT deactivate members whose domain does not match GWS domain', async () => {
      // GWS users are @example.com, but the member is @otherdomain.com
      setupSync({ gwUsers: [makeGwUser('user@example.com')] });

      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_u',
        email: 'user@example.com',
      });
      (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(
        makeMember('user@example.com', { userId: 'user_u' }),
      );
      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([
        makeMember('external@otherdomain.com'),
      ]);

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      expect(result.deactivated).toBe(0);
    });
  });

  // ── Exclude filter mode ────────────────────────────────────────

  describe('exclude filter mode', () => {
    it('should NOT deactivate excluded members in exclude mode', async () => {
      setupSync({
        gwUsers: [makeGwUser('kept@example.com')],
        variables: {
          sync_user_filter_mode: 'exclude',
          sync_excluded_emails: 'excluded@example.com',
        },
      });

      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_kept',
        email: 'kept@example.com',
      });
      (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(
        makeMember('kept@example.com', { userId: 'user_kept' }),
      );

      // Excluded member is in the org but not in the GWS active list
      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([
        makeMember('kept@example.com'),
        makeMember('excluded@example.com'),
      ]);

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      // excluded@example.com should NOT be deactivated even though
      // it's not in the active users list — it was excluded from sync
      const deactivatedEmails = result.details
        .filter((d) => d.status === 'deactivated')
        .map((d) => d.email);
      expect(deactivatedEmails).not.toContain('excluded@example.com');
    });

    it('should exclude users from import by email match', async () => {
      setupSync({
        gwUsers: [
          makeGwUser('include@example.com'),
          makeGwUser('exclude@example.com'),
        ],
        variables: {
          sync_user_filter_mode: 'exclude',
          sync_excluded_emails: 'exclude@example.com',
        },
      });

      // include@example.com gets imported
      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user_include',
        email: 'include@example.com',
      });
      (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedDb.member.create as jest.Mock).mockResolvedValue({
        id: 'mem_include',
      });
      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      // Only include@example.com should be imported; exclude@ is filtered out
      expect(result.imported).toBe(1);
      expect(result.totalFound).toBe(1);
    });
  });

  // ── Mixed scenario ─────────────────────────────────────────────

  describe('mixed scenarios', () => {
    it('should handle a mix of new, existing, deactivated, and suspended users', async () => {
      setupSync({
        gwUsers: [
          makeGwUser('new@example.com'),
          makeGwUser('active@example.com'),
          makeGwUser('deactivated@example.com'),
          makeGwUser('suspended@example.com', { suspended: true }),
        ],
      });

      const callCount = 0;
      (mockedDb.user.findUnique as jest.Mock).mockImplementation(
        ({ where }: { where: { email: string } }) => {
          const map: Record<string, unknown> = {
            'new@example.com': null,
            'active@example.com': {
              id: 'user_active',
              email: 'active@example.com',
            },
            'deactivated@example.com': {
              id: 'user_deact',
              email: 'deactivated@example.com',
            },
          };
          return Promise.resolve(map[where.email] ?? null);
        },
      );
      (mockedDb.user.create as jest.Mock).mockResolvedValue({
        id: 'user_new',
        email: 'new@example.com',
      });

      (mockedDb.member.findFirst as jest.Mock).mockImplementation(
        ({ where }: { where: { organizationId: string; userId: string } }) => {
          const map: Record<string, unknown> = {
            user_active: makeMember('active@example.com', {
              userId: 'user_active',
              deactivated: false,
            }),
            user_deact: makeMember('deactivated@example.com', {
              userId: 'user_deact',
              deactivated: true,
            }),
          };
          return Promise.resolve(map[where.userId] ?? null);
        },
      );
      (mockedDb.member.create as jest.Mock).mockResolvedValue({
        id: 'mem_new',
      });

      // Deactivation pass: suspended@example.com member is active in org
      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([
        makeMember('suspended@example.com'),
        makeMember('active@example.com'),
      ]);
      (mockedDb.member.update as jest.Mock).mockResolvedValue({});

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      expect(result.imported).toBe(1); // new@example.com
      expect(result.skipped).toBe(2); // active + deactivated
      expect(result.reactivated).toBe(0); // deactivated stays deactivated
      expect(result.deactivated).toBe(1); // suspended@example.com
    });
  });

  // ── Response shape ─────────────────────────────────────────────

  describe('response format', () => {
    it('should return success:true and all counter fields', async () => {
      setupSync({ gwUsers: [] });
      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          totalFound: 0,
          totalSuspended: 0,
          imported: 0,
          skipped: 0,
          deactivated: 0,
          reactivated: 0,
          errors: 0,
          details: [],
        }),
      );
    });
  });

  // ── Error handling ─────────────────────────────────────────────

  describe('error handling', () => {
    it('should count errors when user creation fails', async () => {
      setupSync({ gwUsers: [makeGwUser('fail@example.com')] });

      (mockedDb.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedDb.user.create as jest.Mock).mockRejectedValue(
        new Error('DB write failed'),
      );
      (mockedDb.member.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.syncGoogleWorkspaceEmployees(
        orgId,
        connectionId,
      );

      expect(result.errors).toBe(1);
      expect(result.imported).toBe(0);
      const detail = result.details.find((d) => d.email === 'fail@example.com');
      expect(detail?.status).toBe('error');
      expect(detail?.reason).toBe('DB write failed');
    });
  });
});
