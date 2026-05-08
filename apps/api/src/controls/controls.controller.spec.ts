import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ControlsController } from './controls.controller';
import { ControlsService } from './controls.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { CreateControlDto } from './dto/create-control.dto';

// Mock auth.server to avoid importing better-auth ESM in Jest
jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: {
    control: ['create', 'read', 'update', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('ControlsController', () => {
  let controller: ControlsController;
  let service: jest.Mocked<ControlsService>;

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    getOptions: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ControlsController],
      providers: [{ provide: ControlsService, useValue: mockService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ControlsController>(ControlsController);
    service = module.get(ControlsService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should call service.findAll with default pagination', async () => {
      const mockData = { data: [{ id: 'ctrl_1' }], count: 1 };
      mockService.findAll.mockResolvedValue(mockData);

      const result = await controller.findAll('org_1');

      expect(result).toEqual(mockData);
      expect(service.findAll).toHaveBeenCalledWith('org_1', {
        page: 1,
        perPage: 50,
        name: undefined,
        sortBy: undefined,
        sortDesc: false,
      });
    });

    it('should pass parsed pagination parameters', async () => {
      const mockData = { data: [], count: 0 };
      mockService.findAll.mockResolvedValue(mockData);

      await controller.findAll('org_1', '2', '25');

      expect(service.findAll).toHaveBeenCalledWith('org_1', {
        page: 2,
        perPage: 25,
        name: undefined,
        sortBy: undefined,
        sortDesc: false,
      });
    });

    it('should pass name filter and sort parameters', async () => {
      const mockData = { data: [], count: 0 };
      mockService.findAll.mockResolvedValue(mockData);

      await controller.findAll('org_1', '1', '50', 'access', 'name', 'true');

      expect(service.findAll).toHaveBeenCalledWith('org_1', {
        page: 1,
        perPage: 50,
        name: 'access',
        sortBy: 'name',
        sortDesc: true,
      });
    });

    it('should parse sortDesc as false when not "true"', async () => {
      mockService.findAll.mockResolvedValue({ data: [], count: 0 });

      await controller.findAll(
        'org_1',
        undefined,
        undefined,
        undefined,
        undefined,
        'false',
      );

      expect(service.findAll).toHaveBeenCalledWith('org_1', {
        page: 1,
        perPage: 50,
        name: undefined,
        sortBy: undefined,
        sortDesc: false,
      });
    });
  });

  describe('getOptions', () => {
    it('should call service.getOptions with organizationId', async () => {
      const mockOptions = { frameworks: [], categories: [] };
      mockService.getOptions.mockResolvedValue(mockOptions);

      const result = await controller.getOptions('org_1');

      expect(result).toEqual(mockOptions);
      expect(service.getOptions).toHaveBeenCalledWith('org_1');
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and organizationId', async () => {
      const mockControl = { id: 'ctrl_1', name: 'Test Control' };
      mockService.findOne.mockResolvedValue(mockControl);

      const result = await controller.findOne('org_1', 'ctrl_1');

      expect(result).toEqual(mockControl);
      expect(service.findOne).toHaveBeenCalledWith('ctrl_1', 'org_1');
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.findOne.mockRejectedValue(
        new NotFoundException('Control not found'),
      );

      await expect(controller.findOne('org_1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should call service.create with organizationId and dto', async () => {
      const dto: CreateControlDto = {
        name: 'New Control',
        description: 'A test control',
      };
      const mockCreated = {
        id: 'ctrl_new',
        name: 'New Control',
        description: 'A test control',
      };
      mockService.create.mockResolvedValue(mockCreated);

      const result = await controller.create('org_1', dto);

      expect(result).toEqual(mockCreated);
      expect(service.create).toHaveBeenCalledWith('org_1', dto);
    });
  });

  describe('delete', () => {
    it('should call service.delete with id and organizationId', async () => {
      mockService.delete.mockResolvedValue({ success: true });

      const result = await controller.delete('org_1', 'ctrl_1');

      expect(result).toEqual({ success: true });
      expect(service.delete).toHaveBeenCalledWith('ctrl_1', 'org_1');
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.delete.mockRejectedValue(
        new NotFoundException('Control not found'),
      );

      await expect(controller.delete('org_1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
