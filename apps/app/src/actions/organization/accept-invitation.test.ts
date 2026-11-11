import { beforeEach, describe, expect, it, vi } from 'vitest';

type ActionHandler = (args: {
  parsedInput: { inviteCode: string };
  ctx: {
    user: { id: string; email: string; emailVerified: boolean };
    session: { activeOrganizationId: string | null };
  };
}) => Promise<unknown>;

const mocks = vi.hoisted(() => ({
  invitationFindFirst: vi.fn(),
  invitationUpdate: vi.fn(),
  memberFindFirst: vi.fn(),
  memberCreate: vi.fn(),
  memberUpdate: vi.fn(),
  setActiveOrganization: vi.fn(),
  createTrainingVideoEntries: vi.fn(),
}));

vi.mock('../safe-action', () => {
  const builder = {
    metadata: () => builder,
    inputSchema: () => builder,
    action: (handler: ActionHandler) => handler,
  };
  return { authActionClientWithoutOrg: builder };
});

vi.mock('@db/server', () => ({
  db: {
    invitation: {
      findFirst: mocks.invitationFindFirst,
      update: mocks.invitationUpdate,
    },
    member: {
      findFirst: mocks.memberFindFirst,
      create: mocks.memberCreate,
      update: mocks.memberUpdate,
    },
  },
}));

vi.mock('@/utils/auth', () => ({
  auth: { api: { setActiveOrganization: mocks.setActiveOrganization } },
}));

vi.mock('@/lib/db/employee', () => ({
  createTrainingVideoEntries: mocks.createTrainingVideoEntries,
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

import { completeInvitation } from './accept-invitation';

const runAction = completeInvitation as unknown as ActionHandler;

function callWith({ emailVerified }: { emailVerified: boolean }) {
  return runAction({
    parsedInput: { inviteCode: 'inv_1' },
    ctx: {
      user: { id: 'user_1', email: 'user@example.com', emailVerified },
      session: { activeOrganizationId: null },
    },
  });
}

describe('completeInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invitationFindFirst.mockResolvedValue({
      id: 'inv_1',
      organizationId: 'org_1',
      role: 'employee',
      organization: { id: 'org_1', name: 'Org' },
    });
    mocks.memberFindFirst.mockResolvedValue(null);
    mocks.memberCreate.mockResolvedValue({ id: 'mem_1' });
  });

  it('requires a verified email address', async () => {
    await expect(callWith({ emailVerified: false })).rejects.toThrow(
      'Verify your email address to accept this invitation',
    );
    expect(mocks.invitationFindFirst).not.toHaveBeenCalled();
    expect(mocks.memberCreate).not.toHaveBeenCalled();
  });

  it('accepts the invitation for a verified account', async () => {
    await expect(callWith({ emailVerified: true })).resolves.toEqual({
      success: true,
      data: { accepted: true, organizationId: 'org_1' },
    });
    expect(mocks.memberCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        organizationId: 'org_1',
        role: 'employee',
        department: 'none',
      },
    });
    expect(mocks.invitationUpdate).toHaveBeenCalledWith({
      where: { id: 'inv_1' },
      data: { status: 'accepted' },
    });
  });
});
