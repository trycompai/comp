import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@db/server', () => ({
  db: {
    policy: { findUnique: vi.fn(), update: vi.fn() },
    member: { findUnique: vi.fn() },
    policyAcknowledgment: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { db } from '@db/server';
import { acceptAllPolicies, acceptPolicy } from './accept-policies';

const mockDb = db as unknown as {
  policy: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  member: { findUnique: ReturnType<typeof vi.fn> };
  policyAcknowledgment: { upsert: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('acceptPolicy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Pass-through transaction — execute the callback with a tx proxy backed by the mocks
    mockDb.$transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          policy: mockDb.policy,
          member: mockDb.member,
          policyAcknowledgment: mockDb.policyAcknowledgment,
        }),
    );
  });

  it('upserts an ack with denormalized member name+email and pushes signedBy when missing', async () => {
    mockDb.policy.findUnique.mockResolvedValueOnce({
      id: 'pol_1',
      currentVersionId: 'pv_3',
      organizationId: 'org_abc',
      signedBy: [],
    });
    mockDb.member.findUnique.mockResolvedValueOnce({
      id: 'mem_alice',
      user: { name: 'Alice Example', email: 'alice@example.com' },
    });
    mockDb.policyAcknowledgment.upsert.mockResolvedValueOnce({ id: 'polack_1' });
    mockDb.policy.update.mockResolvedValueOnce({});

    const result = await acceptPolicy('pol_1', 'mem_alice');

    expect(mockDb.policyAcknowledgment.upsert).toHaveBeenCalledWith({
      where: {
        policyVersionId_memberId: {
          policyVersionId: 'pv_3',
          memberId: 'mem_alice',
        },
      },
      create: {
        policyVersionId: 'pv_3',
        memberId: 'mem_alice',
        memberName: 'Alice Example',
        memberEmail: 'alice@example.com',
        organizationId: 'org_abc',
      },
      update: {},
    });
    expect(mockDb.policy.update).toHaveBeenCalledWith({
      where: { id: 'pol_1' },
      data: { signedBy: { push: 'mem_alice' } },
    });
    expect(result).toEqual({ success: true });
  });

  it('does not push signedBy when memberId already present (upsert still fires)', async () => {
    mockDb.policy.findUnique.mockResolvedValueOnce({
      id: 'pol_1',
      currentVersionId: 'pv_3',
      organizationId: 'org_abc',
      signedBy: ['mem_alice'],
    });
    mockDb.member.findUnique.mockResolvedValueOnce({
      id: 'mem_alice',
      user: { name: 'Alice', email: 'alice@example.com' },
    });

    await acceptPolicy('pol_1', 'mem_alice');

    expect(mockDb.policyAcknowledgment.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.policy.update).not.toHaveBeenCalled();
  });

  it('returns an error when the policy is not found', async () => {
    mockDb.policy.findUnique.mockResolvedValueOnce(null);
    const result = await acceptPolicy('pol_missing', 'mem_a');
    expect(result.success).toBe(false);
    expect(mockDb.policyAcknowledgment.upsert).not.toHaveBeenCalled();
  });

  it('returns an error when the policy has no currentVersionId', async () => {
    mockDb.policy.findUnique.mockResolvedValueOnce({
      id: 'pol_x',
      currentVersionId: null,
      organizationId: 'org_abc',
      signedBy: [],
    });
    const result = await acceptPolicy('pol_x', 'mem_a');
    expect(result.success).toBe(false);
    expect(mockDb.policyAcknowledgment.upsert).not.toHaveBeenCalled();
  });

  it('returns an error when the member is not found', async () => {
    mockDb.policy.findUnique.mockResolvedValueOnce({
      id: 'pol_1',
      currentVersionId: 'pv_3',
      organizationId: 'org_abc',
      signedBy: [],
    });
    mockDb.member.findUnique.mockResolvedValueOnce(null);
    const result = await acceptPolicy('pol_1', 'mem_missing');
    expect(result.success).toBe(false);
    expect(mockDb.policyAcknowledgment.upsert).not.toHaveBeenCalled();
  });
});

describe('acceptAllPolicies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          policy: mockDb.policy,
          member: mockDb.member,
          policyAcknowledgment: mockDb.policyAcknowledgment,
        }),
    );
  });

  it('upserts an ack for each policy with denormalized member info', async () => {
    mockDb.policy.findUnique
      .mockResolvedValueOnce({
        id: 'pol_1',
        currentVersionId: 'pv_1',
        organizationId: 'org_abc',
        signedBy: [],
      })
      .mockResolvedValueOnce({
        id: 'pol_2',
        currentVersionId: 'pv_2',
        organizationId: 'org_abc',
        signedBy: [],
      });
    mockDb.member.findUnique.mockResolvedValue({
      id: 'mem_alice',
      user: { name: 'Alice', email: 'alice@example.com' },
    });

    const result = await acceptAllPolicies(['pol_1', 'pol_2'], 'mem_alice');

    expect(mockDb.policyAcknowledgment.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.policyAcknowledgment.upsert.mock.calls[0][0].create).toEqual({
      policyVersionId: 'pv_1',
      memberId: 'mem_alice',
      memberName: 'Alice',
      memberEmail: 'alice@example.com',
      organizationId: 'org_abc',
    });
    expect(mockDb.policyAcknowledgment.upsert.mock.calls[1][0].create).toEqual({
      policyVersionId: 'pv_2',
      memberId: 'mem_alice',
      memberName: 'Alice',
      memberEmail: 'alice@example.com',
      organizationId: 'org_abc',
    });
    expect(result).toEqual({ success: true });
  });

  it('skips policies without currentVersionId without aborting the batch', async () => {
    mockDb.policy.findUnique
      .mockResolvedValueOnce({
        id: 'pol_1',
        currentVersionId: null,
        organizationId: 'org_abc',
        signedBy: [],
      })
      .mockResolvedValueOnce({
        id: 'pol_2',
        currentVersionId: 'pv_2',
        organizationId: 'org_abc',
        signedBy: [],
      });
    mockDb.member.findUnique.mockResolvedValue({
      id: 'mem_alice',
      user: { name: 'Alice', email: 'alice@example.com' },
    });

    const result = await acceptAllPolicies(['pol_1', 'pol_2'], 'mem_alice');

    expect(mockDb.policyAcknowledgment.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.policyAcknowledgment.upsert.mock.calls[0][0].create.policyVersionId).toBe('pv_2');
    expect(result).toEqual({ success: true });
  });
});
