import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock auth
vi.mock('@/utils/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      addMember: vi.fn().mockResolvedValue({ id: 'mem_new' }),
      createInvitation: vi.fn().mockResolvedValue({ id: 'inv_new' }),
    },
  },
}));

// Mock db
vi.mock('@db', () => ({
  db: {
    member: { findFirst: vi.fn(), update: vi.fn() },
    user: { findFirst: vi.fn(), create: vi.fn() },
    invitation: { create: vi.fn() },
    organization: { findUnique: vi.fn() },
  },
}));

vi.mock('@comp/email/lib/invite-member', () => ({
  sendInviteMemberEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/db/employee', () => ({
  createTrainingVideoEntries: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks are declared
import { POST } from './route';
import { auth } from '@/utils/auth';
import { db } from '@db';

const mockGetSession = vi.mocked(auth.api.getSession);
const mockMemberFindFirst = vi.mocked((db as any).member.findFirst);
const mockMemberUpdate = vi.mocked((db as any).member.update);
const mockUserFindFirst = vi.mocked((db as any).user.findFirst);
const mockUserCreate = vi.mocked((db as any).user.create);

function createRequest(body: any): NextRequest {
  return new NextRequest('http://localhost:3000/api/people/invite', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/people/invite', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Restore default implementations for mocks that need them
    vi.mocked(auth.api.addMember).mockResolvedValue({ id: 'mem_new' } as any);
    vi.mocked(auth.api.createInvitation).mockResolvedValue({ id: 'inv_new' } as any);
  });

  it('should return 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null as any);

    const response = await POST(createRequest({ invites: [] }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 when user is not admin/owner/auditor', async () => {
    mockGetSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_123', userId: 'usr_123' },
    } as any);
    mockMemberFindFirst.mockResolvedValue({ id: 'mem_1', role: 'employee' } as any);

    const response = await POST(
      createRequest({
        invites: [{ email: 'new@test.com', roles: ['employee'] }],
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("don't have permission");
  });

  it('should return 400 when invites array is empty', async () => {
    mockGetSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_123', userId: 'usr_123' },
    } as any);
    mockMemberFindFirst.mockResolvedValue({ id: 'mem_1', role: 'admin' } as any);

    const response = await POST(createRequest({ invites: [] }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('At least one invite');
  });

  it('should successfully invite an employee without invite flow', async () => {
    mockGetSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_123', userId: 'usr_123' },
    } as any);
    mockMemberFindFirst
      .mockResolvedValueOnce({ id: 'mem_1', role: 'admin' } as any)
      .mockResolvedValueOnce(null);
    mockUserFindFirst.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({ id: 'usr_new' } as any);

    const response = await POST(
      createRequest({
        invites: [{ email: 'employee@test.com', roles: ['employee'] }],
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].success).toBe(true);
    expect(data.results[0].email).toBe('employee@test.com');
  });

  it('should reactivate a deactivated employee', async () => {
    mockGetSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_123', userId: 'usr_123' },
    } as any);
    mockMemberFindFirst
      .mockResolvedValueOnce({ id: 'mem_1', role: 'admin' } as any)
      .mockResolvedValueOnce({ id: 'mem_old', deactivated: true } as any);
    mockUserFindFirst.mockResolvedValue({ id: 'usr_old' } as any);
    mockMemberUpdate.mockResolvedValue({ id: 'mem_old', deactivated: false } as any);

    const response = await POST(
      createRequest({
        invites: [{ email: 'old@test.com', roles: ['employee'] }],
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].success).toBe(true);
    expect(mockMemberUpdate).toHaveBeenCalledWith({
      where: { id: 'mem_old' },
      data: { deactivated: false, role: 'employee' },
    });
  });

  it('should restrict auditors to only invite auditors', async () => {
    mockGetSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_123', userId: 'usr_123' },
    } as any);
    mockMemberFindFirst.mockResolvedValue({ id: 'mem_1', role: 'auditor' } as any);

    const response = await POST(
      createRequest({
        invites: [{ email: 'new@test.com', roles: ['admin'] }],
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].success).toBe(false);
    expect(data.results[0].error).toContain('Auditors can only invite');
  });

  it('should allow auditors to invite other auditors', async () => {
    mockGetSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_123', userId: 'usr_123' },
    } as any);
    mockMemberFindFirst
      .mockResolvedValueOnce({ id: 'mem_1', role: 'auditor' } as any)
      .mockResolvedValueOnce(null);
    mockUserFindFirst.mockResolvedValue(null);

    const response = await POST(
      createRequest({
        invites: [{ email: 'auditor@test.com', roles: ['auditor'] }],
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].success).toBe(true);
  });

  it('should handle multiple invites with mixed results', async () => {
    mockGetSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_123', userId: 'usr_123' },
    } as any);
    mockMemberFindFirst
      .mockResolvedValueOnce({ id: 'mem_1', role: 'admin' } as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockUserFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockUserCreate
      .mockResolvedValueOnce({ id: 'usr_1' } as any)
      .mockRejectedValueOnce(new Error('DB error'));

    const response = await POST(
      createRequest({
        invites: [
          { email: 'ok@test.com', roles: ['employee'] },
          { email: 'fail@test.com', roles: ['employee'] },
        ],
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(2);
    expect(data.results[0].success).toBe(true);
    expect(data.results[1].success).toBe(false);
  });

  it('should reactivate deactivated admin member via inviteWithCheck', async () => {
    mockGetSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_123', userId: 'usr_123' },
    } as any);
    mockMemberFindFirst
      .mockResolvedValueOnce({ id: 'mem_1', role: 'owner' } as any)
      .mockResolvedValueOnce({ id: 'mem_deac', deactivated: true } as any);
    mockUserFindFirst.mockResolvedValue({ id: 'usr_deac' } as any);
    mockMemberUpdate.mockResolvedValue({ id: 'mem_deac', deactivated: false } as any);

    const response = await POST(
      createRequest({
        invites: [{ email: 'deac@test.com', roles: ['admin'] }],
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].success).toBe(true);
    expect(mockMemberUpdate).toHaveBeenCalledWith({
      where: { id: 'mem_deac' },
      data: { deactivated: false, isActive: true, role: 'admin' },
    });
  });
});
