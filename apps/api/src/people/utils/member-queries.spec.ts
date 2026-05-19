import { MemberQueries } from './member-queries';

jest.mock('@db', () => ({
  db: {
    member: {
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  },
}));

import { db } from '@db';

const mockedDb = db as jest.Mocked<typeof db>;

describe('MemberQueries.updateMember — background-check exemption fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedDb.member.update as jest.Mock).mockResolvedValue({ id: 'mem_1' });
  });

  it('persists reason and justification when backgroundCheckExempt is true', async () => {
    await MemberQueries.updateMember('mem_1', 'org_1', {
      backgroundCheckExempt: true,
      backgroundCheckExemptReason: 'other',
      backgroundCheckExemptJustification: 'Founder',
    });

    expect(mockedDb.member.update).toHaveBeenCalledTimes(1);
    expect(mockedDb.member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'mem_1', organizationId: 'org_1' },
        data: expect.objectContaining({
          backgroundCheckExempt: true,
          backgroundCheckExemptReason: 'other',
          backgroundCheckExemptJustification: 'Founder',
        }),
      }),
    );
  });

  it('clears reason and justification when backgroundCheckExempt is set to false', async () => {
    await MemberQueries.updateMember('mem_1', 'org_1', {
      backgroundCheckExempt: false,
    });

    expect(mockedDb.member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          backgroundCheckExempt: false,
          backgroundCheckExemptReason: null,
          backgroundCheckExemptJustification: null,
        }),
      }),
    );
  });

  it('overrides incoming reason/justification when un-exempting', async () => {
    // Defensive: if a client sends contradictory data, false wins —
    // an un-exempt request must not retain stale reason text.
    await MemberQueries.updateMember('mem_1', 'org_1', {
      backgroundCheckExempt: false,
      backgroundCheckExemptReason: 'stale_reason',
      backgroundCheckExemptJustification: 'stale text',
    });

    expect(mockedDb.member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          backgroundCheckExempt: false,
          backgroundCheckExemptReason: null,
          backgroundCheckExemptJustification: null,
        }),
      }),
    );
  });

  it('does not touch reason or justification when the patch omits backgroundCheckExempt', async () => {
    await MemberQueries.updateMember('mem_1', 'org_1', {
      jobTitle: 'Engineer',
    });

    expect(mockedDb.member.update).toHaveBeenCalledTimes(1);
    const call = (mockedDb.member.update as jest.Mock).mock.calls[0][0];
    expect(call.data).not.toHaveProperty('backgroundCheckExemptReason');
    expect(call.data).not.toHaveProperty('backgroundCheckExemptJustification');
  });
});
