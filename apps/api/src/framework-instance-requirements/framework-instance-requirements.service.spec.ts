import { NotFoundException } from '@nestjs/common';
import { FrameworkInstanceRequirementsService } from './framework-instance-requirements.service';

// Mock the db module
jest.mock('@trycompai/db', () => ({
  db: {
    frameworkInstance: {
      findUnique: jest.fn(),
    },
    frameworkInstanceRequirement: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { db } from '@trycompai/db';

const mockedDb = db as jest.Mocked<typeof db>;

describe('FrameworkInstanceRequirementsService', () => {
  let service: FrameworkInstanceRequirementsService;

  const orgId = 'org_1';
  const frameworkInstanceId = 'frm_1';
  const requirementId = 'fir_1';

  beforeEach(() => {
    service = new FrameworkInstanceRequirementsService();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return requirements for a valid framework instance', async () => {
      const mockInstance = { id: frameworkInstanceId, organizationId: orgId };
      const mockRequirements = [
        { id: 'fir_1', name: 'Custom Req', requirementMaps: [] },
      ];

      (mockedDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue(
        mockInstance,
      );
      (
        mockedDb.frameworkInstanceRequirement.findMany as jest.Mock
      ).mockResolvedValue(mockRequirements);

      const result = await service.findAll(frameworkInstanceId, orgId);

      expect(mockedDb.frameworkInstance.findUnique).toHaveBeenCalledWith({
        where: { id: frameworkInstanceId, organizationId: orgId },
      });
      expect(result).toEqual(mockRequirements);
    });

    it('should throw NotFoundException if framework instance not found', async () => {
      (mockedDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.findAll(frameworkInstanceId, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a requirement if it belongs to the org', async () => {
      const mockRequirement = {
        id: requirementId,
        name: 'Custom Req',
        frameworkInstance: { organizationId: orgId },
        requirementMaps: [],
      };

      (
        mockedDb.frameworkInstanceRequirement.findUnique as jest.Mock
      ).mockResolvedValue(mockRequirement);

      const result = await service.findOne(requirementId, orgId);
      expect(result).toEqual(mockRequirement);
    });

    it('should throw NotFoundException if requirement not found', async () => {
      (
        mockedDb.frameworkInstanceRequirement.findUnique as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.findOne(requirementId, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if requirement belongs to different org', async () => {
      const mockRequirement = {
        id: requirementId,
        frameworkInstance: { organizationId: 'org_other' },
      };

      (
        mockedDb.frameworkInstanceRequirement.findUnique as jest.Mock
      ).mockResolvedValue(mockRequirement);

      await expect(service.findOne(requirementId, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a requirement for a valid framework instance', async () => {
      const dto = {
        frameworkInstanceId,
        name: 'New Requirement',
        description: 'A custom requirement',
      };
      const mockInstance = { id: frameworkInstanceId, organizationId: orgId };
      const mockCreated = { id: 'fir_new', ...dto, identifier: '' };

      (mockedDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue(
        mockInstance,
      );
      (
        mockedDb.frameworkInstanceRequirement.create as jest.Mock
      ).mockResolvedValue(mockCreated);

      const result = await service.create(dto, orgId);

      expect(result).toEqual(mockCreated);
      expect(
        mockedDb.frameworkInstanceRequirement.create,
      ).toHaveBeenCalledWith({
        data: {
          frameworkInstanceId,
          name: dto.name,
          identifier: '',
          description: dto.description,
        },
      });
    });

    it('should throw NotFoundException if framework instance not found', async () => {
      (mockedDb.frameworkInstance.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.create(
          {
            frameworkInstanceId,
            name: 'Test',
            description: 'Test',
          },
          orgId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a requirement belonging to the org', async () => {
      const existing = {
        id: requirementId,
        frameworkInstance: { organizationId: orgId },
      };
      const updated = { id: requirementId, name: 'Updated Name' };

      (
        mockedDb.frameworkInstanceRequirement.findUnique as jest.Mock
      ).mockResolvedValue(existing);
      (
        mockedDb.frameworkInstanceRequirement.update as jest.Mock
      ).mockResolvedValue(updated);

      const result = await service.update(
        requirementId,
        { name: 'Updated Name' },
        orgId,
      );

      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException if requirement belongs to different org', async () => {
      const existing = {
        id: requirementId,
        frameworkInstance: { organizationId: 'org_other' },
      };

      (
        mockedDb.frameworkInstanceRequirement.findUnique as jest.Mock
      ).mockResolvedValue(existing);

      await expect(
        service.update(requirementId, { name: 'Updated' }, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a requirement belonging to the org', async () => {
      const existing = {
        id: requirementId,
        frameworkInstance: { organizationId: orgId },
      };

      (
        mockedDb.frameworkInstanceRequirement.findUnique as jest.Mock
      ).mockResolvedValue(existing);
      (
        mockedDb.frameworkInstanceRequirement.delete as jest.Mock
      ).mockResolvedValue(existing);

      const result = await service.delete(requirementId, orgId);

      expect(result).toEqual({
        message: 'Framework instance requirement deleted successfully',
      });
      expect(
        mockedDb.frameworkInstanceRequirement.delete,
      ).toHaveBeenCalledWith({ where: { id: requirementId } });
    });

    it('should throw NotFoundException if requirement not found', async () => {
      (
        mockedDb.frameworkInstanceRequirement.findUnique as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.delete(requirementId, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if requirement belongs to different org', async () => {
      const existing = {
        id: requirementId,
        frameworkInstance: { organizationId: 'org_other' },
      };

      (
        mockedDb.frameworkInstanceRequirement.findUnique as jest.Mock
      ).mockResolvedValue(existing);

      await expect(service.delete(requirementId, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
