import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FrameworksController } from './frameworks.controller';
import { FrameworksService } from './frameworks.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

describe('FrameworksController', () => {
  let controller: FrameworksController;
  let service: jest.Mocked<FrameworksService>;

  const mockService = {
    findAll: jest.fn(),
    delete: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FrameworksController],
      providers: [{ provide: FrameworksService, useValue: mockService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<FrameworksController>(FrameworksController);
    service = module.get(FrameworksService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return framework instances with count', async () => {
      const mockData = [
        { id: 'fi1', frameworkId: 'f1', framework: { id: 'f1', name: 'ISO 27001' } },
        { id: 'fi2', frameworkId: 'f2', framework: { id: 'f2', name: 'SOC 2' } },
      ];
      mockService.findAll.mockResolvedValue(mockData);

      const result = await controller.findAll('org_1');

      expect(result).toEqual({ data: mockData, count: 2 });
      expect(service.findAll).toHaveBeenCalledWith('org_1');
    });

    it('should return empty list when no frameworks', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.findAll('org_1');

      expect(result).toEqual({ data: [], count: 0 });
    });
  });

  describe('delete', () => {
    it('should delegate to service and return result', async () => {
      mockService.delete.mockResolvedValue({ success: true });

      const result = await controller.delete('org_1', 'fi1');

      expect(result).toEqual({ success: true });
      expect(service.delete).toHaveBeenCalledWith('fi1', 'org_1');
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.delete.mockRejectedValue(
        new NotFoundException('Framework instance not found'),
      );

      await expect(controller.delete('org_1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
