import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock auth
vi.mock('@/utils/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock db
vi.mock('@db', () => ({
  db: {
    member: { findFirst: vi.fn() },
    invitation: { findFirst: vi.fn(), delete: vi.fn() },
  },
}));

// Import after mocks are declared
import { DELETE } from './route';
import { auth } from '@/utils/auth';
import { db } from '@db';

const mockGetSession = vi.mocked(auth.api.getSession);
const mockMemberFindFirst = vi.mocked((db as any).member.findFirst);
const mockInvitationFindFirst = vi.mocked((db as any).invitation.findFirst);
const mockInvitationDelete = vi.mocked((db as any).invitation.delete);

function createRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/invitations/inv_123', {
    method: 'DELETE',
  });
}

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe('DELETE /api/invitations/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null as any);

    const response = await DELETE(createRequest(), createParams('inv_123'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 when user is not admin/owner', async () => {
    mockGetSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_123', userId: 'usr_123' },
    } as any);
    mockMemberFindFirst.mockResolvedValue({ id: 'mem_1', role: 'employee' } as any);

    const response = await DELETE(createRequest(), createParams('inv_123'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("don't have permission");
  });

  it('should return 403 when no member record found', async () => {
    mockGetSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_123', userId: 'usr_123' },
    } as any);
    mockMemberFindFirst.mockResolvedValue(null);

    const response = await DELETE(createRequest(), createParams('inv_123'));
    const data = await response.json();

    expect(response.status).toBe(403);
  });

  it('should return 404 when invitation not found', async () => {
    mockGetSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_123', userId: 'usr_123' },
    } as any);
    mockMemberFindFirst.mockResolvedValue({ id: 'mem_1', role: 'admin' } as any);
    mockInvitationFindFirst.mockResolvedValue(null);

    const response = await DELETE(createRequest(), createParams('inv_123'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found or already accepted');
  });

  it('should successfully delete a pending invitation', async () => {
    mockGetSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_123', userId: 'usr_123' },
    } as any);
    mockMemberFindFirst.mockResolvedValue({ id: 'mem_1', role: 'admin' } as any);
    mockInvitationFindFirst.mockResolvedValue({
      id: 'inv_123',
      status: 'pending',
      email: 'invitee@test.com',
    } as any);
    mockInvitationDelete.mockResolvedValue({} as any);

    const response = await DELETE(createRequest(), createParams('inv_123'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockInvitationDelete).toHaveBeenCalledWith({
      where: { id: 'inv_123' },
    });
  });

  it('should allow owners to revoke invitations', async () => {
    mockGetSession.mockResolvedValue({
      session: { activeOrganizationId: 'org_123', userId: 'usr_123' },
    } as any);
    mockMemberFindFirst.mockResolvedValue({ id: 'mem_1', role: 'owner' } as any);
    mockInvitationFindFirst.mockResolvedValue({
      id: 'inv_456',
      status: 'pending',
    } as any);
    mockInvitationDelete.mockResolvedValue({} as any);

    const response = await DELETE(createRequest(), createParams('inv_456'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
