import { ForbiddenException } from '@nestjs/common';

const mockMemberFindMany = jest.fn();
const mockMemberFindFirst = jest.fn();
const mockBindingFindUnique = jest.fn();
const mockBindingUpsert = jest.fn();
const mockOrgRoleFindMany = jest.fn();
jest.mock('@db', () => ({
  db: {
    member: {
      findMany: (...a: unknown[]) => mockMemberFindMany(...a),
      findFirst: (...a: unknown[]) => mockMemberFindFirst(...a),
    },
    mcpOrgBinding: {
      findUnique: (...a: unknown[]) => mockBindingFindUnique(...a),
      upsert: (...a: unknown[]) => mockBindingUpsert(...a),
    },
    organizationRole: {
      findMany: (...a: unknown[]) => mockOrgRoleFindMany(...a),
    },
  },
}));

jest.mock('@trycompai/auth', () => ({
  BUILT_IN_ROLE_PERMISSIONS: {
    owner: { app: ['read'] },
    admin: { app: ['read'] },
    auditor: { app: ['read'] },
    employee: { policy: ['read'], portal: ['read', 'update'] },
    contractor: { policy: ['read'], portal: ['read', 'update'] },
  },
}));

import { McpService } from './mcp.service';

describe('McpService', () => {
  let service: McpService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOrgRoleFindMany.mockResolvedValue([]);
    service = new McpService();
  });

  describe('getOrganizationSelection', () => {
    it('returns only app-access orgs and the current selection', async () => {
      mockMemberFindMany.mockResolvedValue([
        { role: 'owner', organization: { id: 'org_a', name: 'Acme' } },
        // Portal-only — must be excluded.
        { role: 'employee', organization: { id: 'org_b', name: 'Beta' } },
        { role: 'admin', organization: { id: 'org_c', name: 'Gamma' } },
      ]);
      mockBindingFindUnique.mockResolvedValue({ organizationId: 'org_c' });

      const result = await service.getOrganizationSelection('usr_1');

      expect(result.organizations).toEqual([
        { id: 'org_a', name: 'Acme' },
        { id: 'org_c', name: 'Gamma' },
      ]);
      expect(result.selectedOrganizationId).toBe('org_c');
    });

    it('drops a selection the user can no longer use', async () => {
      mockMemberFindMany.mockResolvedValue([
        { role: 'owner', organization: { id: 'org_a', name: 'Acme' } },
      ]);
      mockBindingFindUnique.mockResolvedValue({ organizationId: 'org_gone' });

      const result = await service.getOrganizationSelection('usr_1');

      expect(result.selectedOrganizationId).toBeNull();
    });

    it('excludes Portal-only orgs entirely', async () => {
      mockMemberFindMany.mockResolvedValue([
        { role: 'employee', organization: { id: 'org_b', name: 'Beta' } },
      ]);
      mockBindingFindUnique.mockResolvedValue(null);

      const result = await service.getOrganizationSelection('usr_1');

      expect(result.organizations).toEqual([]);
      expect(result.selectedOrganizationId).toBeNull();
    });
  });

  describe('setOrganization', () => {
    it('saves when the user is a member with app access', async () => {
      mockMemberFindFirst.mockResolvedValue({ role: 'admin' });
      mockBindingUpsert.mockResolvedValue({});

      const result = await service.setOrganization('usr_1', 'org_a');

      expect(result).toEqual({ organizationId: 'org_a' });
      expect(mockBindingUpsert).toHaveBeenCalledWith({
        where: { userId: 'usr_1' },
        create: { userId: 'usr_1', organizationId: 'org_a' },
        update: { organizationId: 'org_a' },
      });
    });

    it('rejects when the user is not a member of the org', async () => {
      mockMemberFindFirst.mockResolvedValue(null);

      await expect(service.setOrganization('usr_1', 'org_x')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockBindingUpsert).not.toHaveBeenCalled();
    });

    it('rejects a member whose role lacks app access', async () => {
      mockMemberFindFirst.mockResolvedValue({ role: 'employee' });

      await expect(service.setOrganization('usr_1', 'org_b')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockBindingUpsert).not.toHaveBeenCalled();
    });
  });
});
