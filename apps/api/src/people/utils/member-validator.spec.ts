import { NotFoundException } from '@nestjs/common';
import { MemberValidator } from './member-validator';

jest.mock('@db', () => ({
  db: {
    member: {
      findFirst: jest.fn(),
    },
  },
}));

import { db } from '@db';

const mockedDb = db as jest.Mocked<typeof db>;

describe('MemberValidator.validateMemberExists — deactivated members', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Regression for "Unable to reactivate user": reactivation flows through the
  // member-update path, which calls validateMemberExists first. A member
  // deactivated via offboarding (deactivated:true) must still be found here, or
  // the update 404s before it can clear the flag.
  it('finds a deactivated member (does not filter deactivated:false)', async () => {
    const deactivatedMember = {
      id: 'mem_1',
      userId: 'usr_1',
      role: 'employee',
      deactivated: true,
      organizationId: 'org_1',
    };

    // Emulate Prisma: a query restricting deactivated:false cannot match a
    // member whose deactivated is true.
    (mockedDb.member.findFirst as jest.Mock).mockImplementation(
      ({ where }: { where: Record<string, unknown> }) => {
        if (
          where.id !== deactivatedMember.id ||
          where.organizationId !== deactivatedMember.organizationId
        ) {
          return Promise.resolve(null);
        }
        if (where.deactivated === false && deactivatedMember.deactivated) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          id: deactivatedMember.id,
          userId: deactivatedMember.userId,
          role: deactivatedMember.role,
        });
      },
    );

    await expect(
      MemberValidator.validateMemberExists('mem_1', 'org_1'),
    ).resolves.toEqual({ id: 'mem_1', userId: 'usr_1', role: 'employee' });
  });

  it('throws NotFoundException when the member is not in the organization', async () => {
    (mockedDb.member.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      MemberValidator.validateMemberExists('mem_x', 'org_1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('scopes the lookup to the organization', async () => {
    (mockedDb.member.findFirst as jest.Mock).mockResolvedValue({
      id: 'mem_1',
      userId: 'usr_1',
      role: 'employee',
    });

    await MemberValidator.validateMemberExists('mem_1', 'org_1');

    const call = (mockedDb.member.findFirst as jest.Mock).mock.calls[0][0];
    expect(call.where.id).toBe('mem_1');
    expect(call.where.organizationId).toBe('org_1');
  });
});
