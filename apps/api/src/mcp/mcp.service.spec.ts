import { ForbiddenException } from '@nestjs/common';

const mockMemberFindMany = jest.fn();
const mockMemberFindFirst = jest.fn();
const mockBindingFindUnique = jest.fn();
const mockBindingUpsert = jest.fn();
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
  },
}));

import { McpService } from './mcp.service';

describe('McpService', () => {
  let service: McpService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new McpService();
  });

  describe('getOrganizationSelection', () => {
    it('returns the user orgs and the current valid selection', async () => {
      mockMemberFindMany.mockResolvedValue([
        { organization: { id: 'org_a', name: 'Acme' } },
        { organization: { id: 'org_b', name: 'Beta' } },
      ]);
      mockBindingFindUnique.mockResolvedValue({ organizationId: 'org_b' });

      const result = await service.getOrganizationSelection('usr_1');

      expect(result.organizations).toEqual([
        { id: 'org_a', name: 'Acme' },
        { id: 'org_b', name: 'Beta' },
      ]);
      expect(result.selectedOrganizationId).toBe('org_b');
    });

    it('drops a stale selection the user is no longer a member of', async () => {
      mockMemberFindMany.mockResolvedValue([
        { organization: { id: 'org_a', name: 'Acme' } },
      ]);
      mockBindingFindUnique.mockResolvedValue({ organizationId: 'org_gone' });

      const result = await service.getOrganizationSelection('usr_1');

      expect(result.selectedOrganizationId).toBeNull();
    });

    it('returns null selection when none is set', async () => {
      mockMemberFindMany.mockResolvedValue([
        { organization: { id: 'org_a', name: 'Acme' } },
      ]);
      mockBindingFindUnique.mockResolvedValue(null);

      const result = await service.getOrganizationSelection('usr_1');

      expect(result.selectedOrganizationId).toBeNull();
    });
  });

  describe('setOrganization', () => {
    it('upserts the binding when the user is a member', async () => {
      mockMemberFindFirst.mockResolvedValue({ id: 'mem_1' });
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
  });
});
