import { Test, TestingModule } from '@nestjs/testing';
import { AdminVendorsController } from './admin-vendors.controller';
import { VendorsService } from '../vendors/vendors.service';

jest.mock('../auth/platform-admin.guard', () => ({
  PlatformAdminGuard: class {
    canActivate() {
      return true;
    }
  },
}));

jest.mock('../auth/auth.server', () => ({
  auth: { api: {} },
}));

jest.mock('@trycompai/db', () => ({
  db: {},
  VendorCategory: {
    cloud: 'cloud',
    infrastructure: 'infrastructure',
    software_as_a_service: 'software_as_a_service',
    finance: 'finance',
    marketing: 'marketing',
    sales: 'sales',
    hr: 'hr',
    other: 'other',
  },
  VendorStatus: {
    not_assessed: 'not_assessed',
    in_progress: 'in_progress',
    assessed: 'assessed',
  },
}));

describe('AdminVendorsController', () => {
  let controller: AdminVendorsController;

  const mockService = {
    findAllByOrganization: jest.fn(),
    triggerAssessment: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminVendorsController],
      providers: [{ provide: VendorsService, useValue: mockService }],
    }).compile();

    controller = module.get<AdminVendorsController>(AdminVendorsController);
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should list vendors for an organization', async () => {
      const vendors = [{ id: 'vnd_1', name: 'Acme' }];
      mockService.findAllByOrganization.mockResolvedValue(vendors);

      const result = await controller.list('org_1');

      expect(mockService.findAllByOrganization).toHaveBeenCalledWith('org_1');
      expect(result).toEqual(vendors);
    });
  });

  describe('create', () => {
    it('should create a vendor with required fields', async () => {
      const created = { id: 'vnd_new', name: 'New Vendor' };
      mockService.create.mockResolvedValue(created);

      const result = await controller.create(
        'org_1',
        { name: 'New Vendor', description: 'A test vendor' },
        { userId: 'usr_admin' },
      );

      expect(mockService.create).toHaveBeenCalledWith(
        'org_1',
        { name: 'New Vendor', description: 'A test vendor' },
        'usr_admin',
      );
      expect(result).toEqual(created);
    });

    it('should create a vendor with all optional fields', async () => {
      const created = { id: 'vnd_new', name: 'Full Vendor' };
      mockService.create.mockResolvedValue(created);

      const dto = {
        name: 'Full Vendor',
        description: 'Cloud provider',
        category: 'cloud' as never,
        status: 'not_assessed' as never,
        website: 'https://example.com',
      };

      const result = await controller.create('org_1', dto, {
        userId: 'usr_admin',
      });

      expect(mockService.create).toHaveBeenCalledWith(
        'org_1',
        dto,
        'usr_admin',
      );
      expect(result).toEqual(created);
    });
  });

  describe('triggerAssessment', () => {
    it('should trigger assessment for a vendor', async () => {
      const response = { runId: 'run_1', publicAccessToken: 'tok_1' };
      mockService.triggerAssessment.mockResolvedValue(response);

      const result = await controller.triggerAssessment('org_1', 'vnd_1', {
        userId: 'usr_admin',
      });

      expect(mockService.triggerAssessment).toHaveBeenCalledWith(
        'vnd_1',
        'org_1',
        'usr_admin',
      );
      expect(result).toEqual(response);
    });
  });
});
