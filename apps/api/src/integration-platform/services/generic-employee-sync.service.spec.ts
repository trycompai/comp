import type { SyncEmployee } from '@trycompai/integration-platform';

const mockUserFindUnique = jest.fn();
const mockUserCreate = jest.fn();
const mockMemberFindFirst = jest.fn();
const mockMemberCreate = jest.fn();
const mockMemberFindMany = jest.fn();
const mockMemberUpdate = jest.fn();
const mockOrgRoleFindMany = jest.fn();

jest.mock('@trycompai/auth', () => ({
  BUILT_IN_ROLE_PERMISSIONS: {
    owner: {},
    admin: {},
    auditor: {},
    employee: {},
    contractor: {},
  },
}));

jest.mock('@db', () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
    },
    member: {
      findFirst: (...args: unknown[]) => mockMemberFindFirst(...args),
      create: (...args: unknown[]) => mockMemberCreate(...args),
      findMany: (...args: unknown[]) => mockMemberFindMany(...args),
      update: (...args: unknown[]) => mockMemberUpdate(...args),
    },
    organizationRole: {
      findMany: (...args: unknown[]) => mockOrgRoleFindMany(...args),
    },
  },
}));

import { GenericEmployeeSyncService } from './generic-employee-sync.service';

describe('GenericEmployeeSyncService role validation', () => {
  let service: GenericEmployeeSyncService;

  const baseEmployee = (
    overrides: Partial<SyncEmployee> = {},
  ): SyncEmployee => ({
    email: 'new-hire@example.com',
    name: 'New Hire',
    status: 'active',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GenericEmployeeSyncService();

    // Default: user does not exist (will be created), no existing member,
    // no other org members (skip phase 2).
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      id: 'user_1',
      email: 'new-hire@example.com',
    });
    mockMemberFindFirst.mockResolvedValue(null);
    mockMemberCreate.mockResolvedValue({ id: 'mem_1' });
    mockMemberFindMany.mockResolvedValue([]);
    mockOrgRoleFindMany.mockResolvedValue([]);
  });

  it('persists a built-in role from the provider as-is', async () => {
    await service.processEmployees({
      organizationId: 'org_1',
      employees: [baseEmployee({ role: 'admin' })],
    });

    expect(mockMemberCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'admin' }),
      }),
    );
  });

  it('persists a known custom role from the provider as-is', async () => {
    mockOrgRoleFindMany.mockResolvedValue([
      { name: 'security-engineer' },
    ]);

    await service.processEmployees({
      organizationId: 'org_1',
      employees: [baseEmployee({ role: 'security-engineer' })],
    });

    expect(mockMemberCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'security-engineer' }),
      }),
    );
  });

  it('falls back to defaultRole when provider sends an unknown role (e.g. Microsoft jobTitle)', async () => {
    await service.processEmployees({
      organizationId: 'org_1',
      employees: [baseEmployee({ role: 'Senior Front End Engineer' })],
      options: { defaultRole: 'employee' },
    });

    expect(mockMemberCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'employee' }),
      }),
    );
  });

  it('falls back to defaultRole when provider sends an empty role', async () => {
    await service.processEmployees({
      organizationId: 'org_1',
      employees: [baseEmployee({ role: '' })],
      options: { defaultRole: 'contractor' },
    });

    expect(mockMemberCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'contractor' }),
      }),
    );
  });

  it('looks up custom roles scoped to the org being synced', async () => {
    await service.processEmployees({
      organizationId: 'org_42',
      employees: [baseEmployee({ role: 'employee' })],
    });

    expect(mockOrgRoleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org_42' },
        select: { name: true },
      }),
    );
  });

  it('keeps only the valid tokens when role is comma-separated', async () => {
    await service.processEmployees({
      organizationId: 'org_1',
      employees: [baseEmployee({ role: 'admin,Senior Front End Engineer' })],
      options: { defaultRole: 'employee' },
    });

    expect(mockMemberCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'admin' }),
      }),
    );
  });

  describe('limbo role self-heal on re-sync', () => {
    it('heals an existing member whose role is entirely invalid', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_1',
        email: 'mc@example.com',
      });
      mockMemberFindFirst.mockResolvedValue({
        id: 'mem_1',
        role: 'Senior Front End Engineer',
        deactivated: false,
      });

      await service.processEmployees({
        organizationId: 'org_1',
        employees: [baseEmployee({ email: 'mc@example.com', role: 'employee' })],
        options: { defaultRole: 'employee' },
      });

      expect(mockMemberUpdate).toHaveBeenCalledWith({
        where: { id: 'mem_1' },
        data: { role: 'employee' },
      });
    });

    it('heals an existing member whose role mixes valid + invalid tokens', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_1',
        email: 'mc@example.com',
      });
      mockMemberFindFirst.mockResolvedValue({
        id: 'mem_1',
        role: 'admin,Senior Front End Engineer',
        deactivated: false,
      });

      await service.processEmployees({
        organizationId: 'org_1',
        employees: [baseEmployee({ email: 'mc@example.com' })],
      });

      expect(mockMemberUpdate).toHaveBeenCalledWith({
        where: { id: 'mem_1' },
        data: { role: 'admin' },
      });
    });

    it('does not touch an existing member whose role is already valid', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_1',
        email: 'mc@example.com',
      });
      mockMemberFindFirst.mockResolvedValue({
        id: 'mem_1',
        role: 'admin',
        deactivated: false,
      });

      await service.processEmployees({
        organizationId: 'org_1',
        employees: [baseEmployee({ email: 'mc@example.com' })],
      });

      expect(mockMemberUpdate).not.toHaveBeenCalled();
    });

    it('heals AND reactivates a deactivated member with a limbo role', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user_1',
        email: 'mc@example.com',
      });
      mockMemberFindFirst.mockResolvedValue({
        id: 'mem_1',
        role: 'Senior Front End Engineer',
        deactivated: true,
      });

      await service.processEmployees({
        organizationId: 'org_1',
        employees: [baseEmployee({ email: 'mc@example.com' })],
        options: { allowReactivation: true, defaultRole: 'employee' },
      });

      expect(mockMemberUpdate).toHaveBeenCalledWith({
        where: { id: 'mem_1' },
        data: { deactivated: false, isActive: true, role: 'employee' },
      });
    });
  });
});
