import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/people-api', () => ({
  inviteMembersViaApi: vi.fn(),
}));

import { POST } from './route';
import { inviteMembersViaApi } from '@/lib/people-api';

const mockInviteMembersViaApi = vi.mocked(inviteMembersViaApi);

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/people/invite', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/people/invite', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return 400 when invites array is empty', async () => {
    const response = await POST(createRequest({ invites: [] }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('At least one invite');
    expect(mockInviteMembersViaApi).not.toHaveBeenCalled();
  });

  it('should proxy API authorization errors', async () => {
    mockInviteMembersViaApi.mockResolvedValue({
      error: "You don't have permission to invite members.",
      status: 403,
    });

    const response = await POST(
      createRequest({
        invites: [{ email: 'new@test.com', roles: ['employee'] }],
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("don't have permission");
  });

  it('should proxy successful invite results', async () => {
    mockInviteMembersViaApi.mockResolvedValue({
      data: {
        results: [{ email: 'employee@test.com', success: true, emailSent: true }],
      },
      status: 200,
    });

    const response = await POST(
      createRequest({
        invites: [{ email: 'employee@test.com', roles: ['employee'] }],
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toEqual([
      {
        email: 'employee@test.com',
        success: true,
        emailSent: true,
      },
    ]);
    expect(mockInviteMembersViaApi).toHaveBeenCalledWith({
      invites: [{ email: 'employee@test.com', roles: ['employee'] }],
    });
  });

  it('should return 500 when the API helper throws', async () => {
    mockInviteMembersViaApi.mockRejectedValue(new Error('Network error'));

    const response = await POST(
      createRequest({
        invites: [{ email: 'new@test.com', roles: ['employee'] }],
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to process invitations.');
  });
});
