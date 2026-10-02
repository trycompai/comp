import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { db } from '@db';
import { PeopleService } from './people.service';
import { FleetService } from '../lib/fleet.service';
import { TimelinesService } from '../timelines/timelines.service';
import { MemberQueries } from './utils/member-queries';
import { MemberValidator } from './utils/member-validator';
import type { AuthContext } from '../auth/types';

jest.mock('@db', () => ({
  db: {
    member: { findFirst: jest.fn() },
    organizationRole: { findMany: jest.fn() },
  },
  Departments: { it: 'it' },
}));
jest.mock('@trycompai/auth', () => ({
  BUILT_IN_ROLE_PERMISSIONS: {
    owner: { member: ['create', 'read', 'update', 'delete'], task: ['update'] },
    admin: { member: ['create', 'read', 'update', 'delete'], task: ['update'] },
    auditor: { member: ['create', 'read'], task: ['read'] },
    employee: { policy: ['read'], portal: ['read', 'update'] },
    contractor: { policy: ['read'], portal: ['read', 'update'] },
  },
  isRestrictedRole: (role: string) => ['employee', 'contractor'].includes(role),
}));
jest.mock('./utils/member-validator');
jest.mock('./utils/member-queries');
jest.mock('../timelines/timelines.service', () => ({
  TimelinesService: class {},
}));
jest.mock('./utils/member-deactivation', () => ({}));
jest.mock('./utils/login-email-change', () => ({}));
jest.mock('../frameworks/frameworks-timeline.helper', () => ({
  checkAutoCompletePhases: jest.fn().mockResolvedValue(undefined),
}));

const session: AuthContext = {
  organizationId: 'org_123',
  authType: 'session',
  isApiKey: false,
  isPlatformAdmin: false,
  userId: 'usr_caller',
  userRoles: ['owner'],
};
const key: AuthContext = {
  organizationId: 'org_123',
  authType: 'api-key',
  isApiKey: true,
  isPlatformAdmin: false,
  userRoles: null,
  apiKeyScopes: ['member:create'],
};

describe('member creation role authorization', () => {
  let service: PeopleService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        PeopleService,
        { provide: FleetService, useValue: {} },
        { provide: TimelinesService, useValue: {} },
      ],
    }).compile();
    service = module.get(PeopleService);
    jest
      .mocked(db.member)
      .findFirst.mockImplementation(
        jest.fn().mockResolvedValue({ role: 'auditor' }),
      );
    jest
      .mocked(db.organizationRole)
      .findMany.mockImplementation(jest.fn().mockResolvedValue([]));
    jest.mocked(MemberQueries).createMember.mockImplementation(
      jest.fn().mockResolvedValue({
        id: 'mem_created',
        user: { name: 'New member' },
      }),
    );
  });

  it.each(['owner', 'admin', 'employee,owner', 'employee,admin'])(
    'denies auditor creation of %s before any write',
    async (role) => {
      await expect(
        service.create({
          organizationId: 'org_123',
          createData: { userId: 'usr_second_account', role },
          authContext: session,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(jest.mocked(MemberQueries).createMember).not.toHaveBeenCalled();
      expect(jest.mocked(MemberValidator).validateUser).not.toHaveBeenCalled();
    },
  );

  it.each(['owner', 'admin', 'auditor'])(
    'denies a member:create key creation of %s',
    async (role) => {
      await expect(
        service.create({
          organizationId: 'org_123',
          createData: { userId: 'usr_second_account', role },
          authContext: key,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(jest.mocked(MemberQueries).createMember).not.toHaveBeenCalled();
    },
  );

  it('rejects custom roles that exceed effective permissions', async () => {
    jest
      .mocked(db.organizationRole)
      .findMany.mockImplementation(
        jest
          .fn()
          .mockResolvedValue([
            { name: 'automation-admin', permissions: '{"task":["update"]}' },
          ]),
      );
    await expect(
      service.create({
        organizationId: 'org_123',
        createData: { userId: 'usr_second_account', role: 'automation-admin' },
        authContext: session,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(jest.mocked(MemberQueries).createMember).not.toHaveBeenCalled();
  });

  it.each(['missing-role', 'constructor', 'employee,'])(
    'rejects unknown or malformed role %s',
    async (role) => {
      await expect(
        service.create({
          organizationId: 'org_123',
          createData: { userId: 'usr_second_account', role },
          authContext: session,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(jest.mocked(MemberQueries).createMember).not.toHaveBeenCalled();
    },
  );

  it('allows restricted roles for scoped keys', async () => {
    await service.create({
      organizationId: 'org_123',
      createData: { userId: 'usr_second_account', role: 'employee' },
      authContext: key,
    });
    expect(jest.mocked(MemberQueries).createMember).toHaveBeenCalled();
  });

  it('allows an admin to assign admin after checking current membership', async () => {
    jest
      .mocked(db.member)
      .findFirst.mockImplementation(
        jest.fn().mockResolvedValue({ role: 'admin' }),
      );
    await service.create({
      organizationId: 'org_123',
      createData: { userId: 'usr_second_account', role: 'admin' },
      authContext: session,
    });
    expect(jest.mocked(db.member).findFirst.mock.calls).toEqual([
      [
        {
          where: {
            userId: 'usr_caller',
            organizationId: 'org_123',
            isActive: true,
            deactivated: false,
          },
          select: { role: true },
        },
      ],
    ]);
    expect(jest.mocked(MemberQueries).createMember).toHaveBeenCalled();
  });

  it('allows a custom role within the caller permission ceiling', async () => {
    jest
      .mocked(db.organizationRole)
      .findMany.mockImplementation(
        jest
          .fn()
          .mockResolvedValue([
            { name: 'task-viewer', permissions: '{"task":["read"]}' },
          ]),
      );
    await service.create({
      organizationId: 'org_123',
      createData: { userId: 'usr_second_account', role: 'task-viewer' },
      authContext: session,
    });
    expect(jest.mocked(MemberQueries).createMember).toHaveBeenCalled();
  });

  it('checks every bulk role before writing any member', async () => {
    await expect(
      service.bulkCreate({
        organizationId: 'org_123',
        authContext: key,
        bulkCreateData: {
          members: [
            { userId: 'usr_valid', role: 'employee' },
            { userId: 'usr_escalate', role: 'admin' },
          ],
        },
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(jest.mocked(MemberQueries).bulkCreateMembers).not.toHaveBeenCalled();
    expect(jest.mocked(MemberValidator).validateUser).not.toHaveBeenCalled();
  });

  it('fails closed with no authenticated caller', async () => {
    await expect(
      service.create({
        organizationId: 'org_123',
        createData: { userId: 'usr_second_account', role: 'employee' },
        authContext: { ...session, userId: undefined },
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(jest.mocked(MemberQueries).createMember).not.toHaveBeenCalled();
  });

  it('fails closed for a removed or deactivated member', async () => {
    jest.mocked(db.member).findFirst.mockResolvedValue(null);
    await expect(
      service.create({
        organizationId: 'org_123',
        createData: { userId: 'usr_second_account', role: 'employee' },
        authContext: session,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('does not treat empty API-key scopes as unrestricted', async () => {
    await expect(
      service.create({
        organizationId: 'org_123',
        createData: { userId: 'usr_second_account', role: 'employee' },
        authContext: { ...key, apiKeyScopes: [] },
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('does not grant a service token membership authority', async () => {
    await expect(
      service.create({
        organizationId: 'org_123',
        createData: { userId: 'usr_second_account', role: 'employee' },
        authContext: {
          ...session,
          authType: 'service',
          isServiceToken: true,
          serviceName: 'Trigger.dev Workers',
        },
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
