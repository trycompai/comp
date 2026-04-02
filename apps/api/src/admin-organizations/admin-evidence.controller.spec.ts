import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminEvidenceController } from './admin-evidence.controller';
import { EvidenceFormsService } from '../evidence-forms/evidence-forms.service';

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

jest.mock('@db', () => ({ db: {} }));

describe('AdminEvidenceController', () => {
  let controller: AdminEvidenceController;

  const mockService = {
    getFormStatuses: jest.fn(),
    getFormWithSubmissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminEvidenceController],
      providers: [
        { provide: EvidenceFormsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<AdminEvidenceController>(AdminEvidenceController);
    jest.clearAllMocks();
  });

  describe('listFormStatuses', () => {
    it('should return form statuses', async () => {
      const statuses = {
        'access-request': { lastSubmittedAt: '2026-01-01' },
        meeting: { lastSubmittedAt: null },
      };
      mockService.getFormStatuses.mockResolvedValue(statuses);

      const result = await controller.listFormStatuses('org_1');

      expect(mockService.getFormStatuses).toHaveBeenCalledWith('org_1');
      expect(result).toEqual(statuses);
    });
  });

  describe('getFormWithSubmissions', () => {
    it('should return form with submissions', async () => {
      const detail = {
        form: { type: 'meeting', label: 'Meeting' },
        submissions: [],
        total: 0,
      };
      mockService.getFormWithSubmissions.mockResolvedValue(detail);
      const mockReq = { userId: 'usr_admin1' };

      const result = await controller.getFormWithSubmissions(
        'org_1',
        'meeting',
        mockReq,
      );

      expect(mockService.getFormWithSubmissions).toHaveBeenCalledWith({
        organizationId: 'org_1',
        authContext: expect.objectContaining({
          userId: 'usr_admin1',
          isPlatformAdmin: true,
          isApiKey: false,
          userRoles: ['admin'],
        }),
        formType: 'meeting',
        search: undefined,
        limit: undefined,
        offset: undefined,
      });
      expect(result).toEqual(detail);
    });

    it('should reject empty formType', async () => {
      const mockReq = { userId: 'usr_admin1' };
      await expect(
        controller.getFormWithSubmissions('org_1', '', mockReq),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
