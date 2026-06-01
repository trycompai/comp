jest.mock('@db', () => ({ db: {} }));

import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import { IsmsDocumentTemplateController } from './isms-document-template.controller';
import { IsmsDocumentTemplateService } from './isms-document-template.service';

jest.mock('../../auth/platform-admin.guard', () => ({
  PlatformAdminGuard: class MockPlatformAdminGuard {},
}));

describe('IsmsDocumentTemplateController', () => {
  let controller: IsmsDocumentTemplateController;

  const mockService = {
    findAll: jest.fn(),
    update: jest.fn(),
    linkRequirement: jest.fn(),
    unlinkRequirement: jest.fn(),
    linkControlTemplate: jest.fn(),
    unlinkControlTemplate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IsmsDocumentTemplateController],
      providers: [
        { provide: IsmsDocumentTemplateService, useValue: mockService },
      ],
    })
      .overrideGuard(PlatformAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(IsmsDocumentTemplateController);
    jest.clearAllMocks();
  });

  it('passes the frameworkId filter to findAll', async () => {
    mockService.findAll.mockResolvedValue([]);

    await controller.findAll('fw_1');

    expect(mockService.findAll).toHaveBeenCalledWith('fw_1');
  });

  it('passes id and dto to update', async () => {
    mockService.update.mockResolvedValue({ id: 'tpl_ctx' });

    await controller.update('tpl_ctx', { name: 'New' });

    expect(mockService.update).toHaveBeenCalledWith('tpl_ctx', { name: 'New' });
  });

  it('maps params + query to linkRequirement', async () => {
    mockService.linkRequirement.mockResolvedValue({ message: 'linked' });

    await controller.linkRequirement('tpl_ctx', 'req_41', 'fw_1');

    expect(mockService.linkRequirement).toHaveBeenCalledWith({
      templateId: 'tpl_ctx',
      requirementId: 'req_41',
      frameworkId: 'fw_1',
    });
  });

  it('maps params + query to unlinkRequirement', async () => {
    mockService.unlinkRequirement.mockResolvedValue({ message: 'unlinked' });

    await controller.unlinkRequirement('tpl_ctx', 'req_41', 'fw_1');

    expect(mockService.unlinkRequirement).toHaveBeenCalledWith({
      templateId: 'tpl_ctx',
      requirementId: 'req_41',
      frameworkId: 'fw_1',
    });
  });

  it('maps params + query to linkControlTemplate', async () => {
    mockService.linkControlTemplate.mockResolvedValue({ message: 'linked' });

    await controller.linkControlTemplate('tpl_ctx', 'ct_1', 'fw_1');

    expect(mockService.linkControlTemplate).toHaveBeenCalledWith({
      templateId: 'tpl_ctx',
      controlTemplateId: 'ct_1',
      frameworkId: 'fw_1',
    });
  });

  it('maps params + query to unlinkControlTemplate', async () => {
    mockService.unlinkControlTemplate.mockResolvedValue({ message: 'unlinked' });

    await controller.unlinkControlTemplate('tpl_ctx', 'ct_1', 'fw_1');

    expect(mockService.unlinkControlTemplate).toHaveBeenCalledWith({
      templateId: 'tpl_ctx',
      controlTemplateId: 'ct_1',
      frameworkId: 'fw_1',
    });
  });
});
