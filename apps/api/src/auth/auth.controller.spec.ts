const mockUserFindUnique = jest.fn();
const mockMemberFindMany = jest.fn();
const mockMemberCount = jest.fn();
const mockInvitationFindFirst = jest.fn();

jest.mock('@db', () => ({
  db: {
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
    member: {
      findMany: (...a: unknown[]) => mockMemberFindMany(...a),
      count: (...a: unknown[]) => mockMemberCount(...a),
    },
    invitation: { findFirst: (...a: unknown[]) => mockInvitationFindFirst(...a) },
  },
}));

// Both guards import ./auth.server, which validates SECRET_KEY and pulls in
// better-auth/redis at module load. Stub them so importing the controller is
// hermetic — the test calls the method directly and never runs the guards.
jest.mock('./hybrid-auth.guard', () => ({ HybridAuthGuard: class {} }));
jest.mock('./permission.guard', () => ({
  PermissionGuard: class {},
  PERMISSIONS_KEY: 'permissions',
}));

import { AuthController } from './auth.controller';
import type { AuthContext } from './types';

const sessionContext = (): AuthContext => ({
  organizationId: 'org_1',
  authType: 'session',
  isApiKey: false,
  isPlatformAdmin: false,
  userRoles: null,
  userId: 'user_1',
  userEmail: 'user@example.com',
});

describe('AuthController.getMe — hasInactiveMembership (CS-569)', () => {
  const controller = new AuthController();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({
      id: 'user_1',
      email: 'user@example.com',
      name: 'User',
      image: null,
      role: 'user',
    });
    mockInvitationFindFirst.mockResolvedValue(null);
  });

  it('returns hasInactiveMembership: false for a genuinely new user (no memberships at all)', async () => {
    mockMemberFindMany.mockResolvedValue([]);
    mockMemberCount.mockResolvedValue(0);

    const res = await controller.getMe(sessionContext());

    expect(res.organizations).toEqual([]);
    expect(res.hasInactiveMembership).toBe(false);
  });

  it('returns hasInactiveMembership: true for an offboarded user (no active org, only deactivated memberships)', async () => {
    mockMemberFindMany.mockResolvedValue([]); // no ACTIVE memberships
    mockMemberCount.mockResolvedValue(1); // one deactivated/inactive membership

    const res = await controller.getMe(sessionContext());

    expect(res.organizations).toEqual([]);
    expect(res.hasInactiveMembership).toBe(true);
    // The count that distinguishes "offboarded" from "new" must match
    // memberships that are deactivated OR no longer active.
    expect(mockMemberCount).toHaveBeenCalledWith({
      where: {
        userId: 'user_1',
        OR: [{ deactivated: true }, { isActive: false }],
      },
    });
  });

  it('returns hasInactiveMembership: false for an active member', async () => {
    mockMemberFindMany.mockResolvedValue([
      {
        id: 'member_1',
        role: 'owner',
        organizationId: 'org_1',
        organization: {
          id: 'org_1',
          name: 'Org',
          logo: null,
          onboardingCompleted: true,
          hasAccess: true,
          createdAt: new Date(),
        },
      },
    ]);
    mockMemberCount.mockResolvedValue(0);

    const res = await controller.getMe(sessionContext());

    expect(res.organizations).toHaveLength(1);
    expect(res.hasInactiveMembership).toBe(false);
  });
});
