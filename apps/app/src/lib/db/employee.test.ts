import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: { NEXT_PUBLIC_PORTAL_URL: 'https://portal.example.com' },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@db/server', () => ({
  db: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    employeeTrainingVideoCompletion: {
      createMany: vi.fn(),
    },
  },
}));

import { db, type Departments } from '@db/server';
import { completeEmployeeCreation } from './employee';

const mockDb = db as unknown as {
  user: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  member: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  employeeTrainingVideoCompletion: {
    createMany: ReturnType<typeof vi.fn>;
  };
};

describe('completeEmployeeCreation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates new employees with a verified email so trusted SSO providers can link', async () => {
    mockDb.user.findFirst.mockResolvedValue(null);
    mockDb.user.create.mockResolvedValue({ id: 'usr_new' });
    mockDb.member.create.mockResolvedValue({ id: 'mem_new', userId: 'usr_new' });
    mockDb.employeeTrainingVideoCompletion.createMany.mockResolvedValue({ count: 1 });

    const member = await completeEmployeeCreation({
      name: 'New Employee',
      email: 'new.employee@example.com',
      department: 'it' as Departments,
      organizationId: 'org_123',
    });

    expect(member).toEqual({ id: 'mem_new', userId: 'usr_new' });
    // An unverified local user makes better-auth refuse to link trusted OAuth
    // providers (account_not_linked) — see the comment in employee.ts.
    expect(mockDb.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ emailVerified: true }),
    });
  });

  it('does not touch the user row for an already-existing user', async () => {
    mockDb.user.findFirst.mockResolvedValue({ id: 'usr_existing' });
    mockDb.member.findFirst.mockResolvedValue(null);
    mockDb.member.create.mockResolvedValue({ id: 'mem_new', userId: 'usr_existing' });
    mockDb.employeeTrainingVideoCompletion.createMany.mockResolvedValue({ count: 1 });

    await completeEmployeeCreation({
      name: 'Existing User',
      email: 'existing@example.com',
      department: 'it' as Departments,
      organizationId: 'org_123',
    });

    expect(mockDb.user.create).not.toHaveBeenCalled();
  });
});
