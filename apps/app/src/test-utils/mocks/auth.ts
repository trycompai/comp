import { Departments, type Member, type Session, type User } from '@db';
import { vi } from 'vitest';

const DEFAULT_EMAIL_PREFERENCES: User['emailPreferences'] = {
  policyNotifications: true,
  taskReminders: true,
  weeklyTaskDigest: true,
  unassignedItemsNotifications: true,
};

// Mock auth API structure
export const mockAuthApi = {
  getSession: vi.fn(),
  setActiveOrganization: vi.fn(),
  getActiveMember: vi.fn(),
};

export const mockAuth = {
  api: mockAuthApi,
};

// Note: To use these mocks in your test files, add this at the top of your test file:
//
// import { vi } from 'vitest';
//
// // Mock auth module before any other imports
// vi.mock('@/utils/auth', async () => {
//   const { mockAuth } = await import('@/test-utils/mocks/auth');
//   return { auth: mockAuth };
// });
//
// // Then import the test utilities
// import { mockAuth, setupAuthMocks } from '@/test-utils/mocks/auth';

// Mock session data
export const createMockSession = (overrides?: Partial<Session>): Session => ({
  id: 'session_test123',
  token: 'test_token',
  userId: 'user_test123',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent',
  activeOrganizationId: 'org_test123',
  ...overrides,
});

// Mock user data
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user_test123',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  image: null,
  lastLogin: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  emailNotificationsUnsubscribed: false,
  emailPreferences: DEFAULT_EMAIL_PREFERENCES,
  isPlatformAdmin: false,
  ...overrides,
});

// Mock member data
export const createMockMember = (overrides?: Partial<Member>): Member => ({
  id: 'member_test123',
  userId: 'user_test123',
  organizationId: 'org_test123',
  role: 'owner',
  createdAt: new Date(),
  department: Departments.none,
  isActive: true,
  fleetDmLabelId: null,
  deactivated: false,
  ...overrides,
});

// Helper to set up auth mocks with proper return structure
export const setupAuthMocks = (options?: {
  session?: Session | null;
  user?: User | null;
  member?: Member | null;
}) => {
  const sessionData = options?.session === null ? null : (options?.session ?? createMockSession());
  const userData = options?.user === null ? null : (options?.user ?? createMockUser());
  const memberData =
    options?.member ??
    (sessionData
      ? createMockMember({
          userId: userData?.id,
          organizationId: sessionData.activeOrganizationId || 'org_test123',
        })
      : null);

  // Mock getSession to return the proper structure
  mockAuthApi.getSession.mockResolvedValue(
    sessionData && userData ? { session: sessionData, user: userData } : null,
  );

  // Mock getActiveMember
  mockAuthApi.getActiveMember.mockResolvedValue(memberData);

  return {
    session: sessionData,
    user: userData,
    member: memberData,
  };
};
