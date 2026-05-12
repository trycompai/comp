import { Test, TestingModule } from '@nestjs/testing';
import { AdminFrameworksController } from './admin-frameworks.controller';
import { FrameworksService } from '../frameworks/frameworks.service';

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

jest.mock('@db', () => ({
  db: {},
  AuditLogEntityType: {
    organization: 'organization',
    people: 'people',
    control: 'control',
    policy: 'policy',
    task: 'task',
    vendor: 'vendor',
    risk: 'risk',
    finding: 'finding',
    framework: 'framework',
    integration: 'integration',
    trust: 'trust',
    pentest: 'pentest',
  },
  CommentEntityType: {
    task: 'task',
    vendor: 'vendor',
    risk: 'risk',
    policy: 'policy',
  },
  FindingType: { soc2: 'soc2', iso27001: 'iso27001' },
}));

jest.mock('@trigger.dev/sdk', () => ({
  tasks: { trigger: jest.fn() },
}));

jest.mock('../frameworks/frameworks-scores.helper', () => ({
  getOverviewScores: jest.fn(),
  getCurrentMember: jest.fn(),
  computeFrameworkComplianceScore: jest.fn(),
}));

describe('AdminFrameworksController', () => {
  let controller: AdminFrameworksController;

  const mockService = {
    findAll: jest.fn(),
    findAvailable: jest.fn(),
    addFrameworks: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminFrameworksController],
      providers: [{ provide: FrameworksService, useValue: mockService }],
    }).compile();

    controller = module.get<AdminFrameworksController>(
      AdminFrameworksController,
    );
    jest.clearAllMocks();
  });

  it('lists active frameworks and only unavailable platform frameworks', async () => {
    const activeFramework = {
      id: 'fi_1',
      framework: { id: 'fw_soc2', name: 'SOC 2' },
      customFramework: null,
    };
    mockService.findAll.mockResolvedValue([activeFramework]);
    mockService.findAvailable.mockResolvedValue([
      { id: 'fw_soc2', name: 'SOC 2', isCustom: false },
      { id: 'fw_iso', name: 'ISO 27001', isCustom: false },
      { id: 'cf_1', name: 'Custom', isCustom: true },
    ]);

    const result = await controller.list('org_1');

    expect(mockService.findAll).toHaveBeenCalledWith('org_1');
    expect(mockService.findAvailable).toHaveBeenCalledWith('org_1');
    expect(result).toEqual({
      frameworks: [activeFramework],
      availableFrameworks: [
        { id: 'fw_iso', name: 'ISO 27001', isCustom: false },
      ],
    });
  });

  it('adds frameworks to the requested organization', async () => {
    const created = { success: true, frameworksAdded: 1 };
    mockService.addFrameworks.mockResolvedValue(created);

    const result = await controller.addFrameworks('org_1', {
      frameworkIds: ['fw_soc2'],
    });

    expect(mockService.addFrameworks).toHaveBeenCalledWith('org_1', [
      'fw_soc2',
    ]);
    expect(result).toEqual(created);
  });

  it('deletes framework instances from the requested organization', async () => {
    mockService.delete.mockResolvedValue({ success: true });

    const result = await controller.deleteFramework('org_1', 'fi_1');

    expect(mockService.delete).toHaveBeenCalledWith('fi_1', 'org_1');
    expect(result).toEqual({ success: true });
  });
});
