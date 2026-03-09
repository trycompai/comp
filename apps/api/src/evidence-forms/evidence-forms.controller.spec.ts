import { Test, TestingModule } from '@nestjs/testing';
import { EvidenceFormsController } from './evidence-forms.controller';
import { EvidenceFormsService } from './evidence-forms.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext as AuthContextType } from '../auth/types';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@comp/auth', () => ({
  statement: {
    evidence: ['create', 'read', 'update', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('EvidenceFormsController', () => {
  let controller: EvidenceFormsController;
  let service: jest.Mocked<EvidenceFormsService>;

  const mockService = {
    listForms: jest.fn(),
    getFormStatuses: jest.fn(),
    getMySubmissions: jest.fn(),
    getPendingSubmissionCount: jest.fn(),
    getFormWithSubmissions: jest.fn(),
    getSubmission: jest.fn(),
    deleteSubmission: jest.fn(),
    submitForm: jest.fn(),
    uploadSubmission: jest.fn(),
    reviewSubmission: jest.fn(),
    uploadFile: jest.fn(),
    exportCsv: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const mockAuthContext: AuthContextType = {
    organizationId: 'org_1',
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userId: 'user_1',
    userEmail: 'test@example.com',
    userRoles: ['admin'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvidenceFormsController],
      providers: [{ provide: EvidenceFormsService, useValue: mockService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<EvidenceFormsController>(EvidenceFormsController);
    service = module.get(EvidenceFormsService);

    jest.clearAllMocks();
  });

  describe('listForms', () => {
    it('should call service.listForms and return result', () => {
      const mockForms = [{ type: 'security-awareness' }];
      mockService.listForms.mockReturnValue(mockForms);

      const result = controller.listForms();

      expect(result).toEqual(mockForms);
      expect(service.listForms).toHaveBeenCalled();
    });
  });

  describe('getFormStatuses', () => {
    it('should call service.getFormStatuses with organizationId', async () => {
      const mockStatuses = { 'security-awareness': '2024-01-01' };
      mockService.getFormStatuses.mockResolvedValue(mockStatuses);

      const result = await controller.getFormStatuses('org_1');

      expect(result).toEqual(mockStatuses);
      expect(service.getFormStatuses).toHaveBeenCalledWith('org_1');
    });
  });

  describe('getMySubmissions', () => {
    it('should call service.getMySubmissions with correct params', async () => {
      const mockSubmissions = [{ id: 'sub_1' }];
      mockService.getMySubmissions.mockResolvedValue(mockSubmissions);

      const result = await controller.getMySubmissions(
        'org_1',
        mockAuthContext,
        'security-awareness',
      );

      expect(result).toEqual(mockSubmissions);
      expect(service.getMySubmissions).toHaveBeenCalledWith({
        organizationId: 'org_1',
        authContext: mockAuthContext,
        formType: 'security-awareness',
      });
    });

    it('should pass undefined formType when not provided', async () => {
      mockService.getMySubmissions.mockResolvedValue([]);

      await controller.getMySubmissions('org_1', mockAuthContext);

      expect(service.getMySubmissions).toHaveBeenCalledWith({
        organizationId: 'org_1',
        authContext: mockAuthContext,
        formType: undefined,
      });
    });
  });

  describe('getPendingSubmissionCount', () => {
    it('should call service.getPendingSubmissionCount with correct params', async () => {
      const mockCount = { count: 3 };
      mockService.getPendingSubmissionCount.mockResolvedValue(mockCount);

      const result = await controller.getPendingSubmissionCount(
        'org_1',
        mockAuthContext,
      );

      expect(result).toEqual(mockCount);
      expect(service.getPendingSubmissionCount).toHaveBeenCalledWith({
        organizationId: 'org_1',
        authContext: mockAuthContext,
      });
    });
  });

  describe('getFormWithSubmissions', () => {
    it('should call service.getFormWithSubmissions with all params', async () => {
      const mockData = { form: {}, submissions: [] };
      mockService.getFormWithSubmissions.mockResolvedValue(mockData);

      const result = await controller.getFormWithSubmissions(
        'org_1',
        mockAuthContext,
        'security-awareness',
        'search-term',
        '10',
        '0',
      );

      expect(result).toEqual(mockData);
      expect(service.getFormWithSubmissions).toHaveBeenCalledWith({
        organizationId: 'org_1',
        authContext: mockAuthContext,
        formType: 'security-awareness',
        search: 'search-term',
        limit: '10',
        offset: '0',
      });
    });

    it('should pass undefined for optional query params', async () => {
      mockService.getFormWithSubmissions.mockResolvedValue({});

      await controller.getFormWithSubmissions(
        'org_1',
        mockAuthContext,
        'security-awareness',
      );

      expect(service.getFormWithSubmissions).toHaveBeenCalledWith({
        organizationId: 'org_1',
        authContext: mockAuthContext,
        formType: 'security-awareness',
        search: undefined,
        limit: undefined,
        offset: undefined,
      });
    });
  });

  describe('getSubmission', () => {
    it('should call service.getSubmission with correct params', async () => {
      const mockSubmission = { id: 'sub_1', data: {} };
      mockService.getSubmission.mockResolvedValue(mockSubmission);

      const result = await controller.getSubmission(
        'org_1',
        mockAuthContext,
        'security-awareness',
        'sub_1',
      );

      expect(result).toEqual(mockSubmission);
      expect(service.getSubmission).toHaveBeenCalledWith({
        organizationId: 'org_1',
        authContext: mockAuthContext,
        formType: 'security-awareness',
        submissionId: 'sub_1',
      });
    });
  });

  describe('deleteSubmission', () => {
    it('should call service.deleteSubmission with correct params', async () => {
      const mockResult = { success: true };
      mockService.deleteSubmission.mockResolvedValue(mockResult);

      const result = await controller.deleteSubmission(
        'org_1',
        mockAuthContext,
        'security-awareness',
        'sub_1',
      );

      expect(result).toEqual(mockResult);
      expect(service.deleteSubmission).toHaveBeenCalledWith({
        organizationId: 'org_1',
        authContext: mockAuthContext,
        formType: 'security-awareness',
        submissionId: 'sub_1',
      });
    });
  });

  describe('submitForm', () => {
    it('should call service.submitForm with correct params', async () => {
      const body = { field1: 'value1' };
      const mockResult = { id: 'sub_new' };
      mockService.submitForm.mockResolvedValue(mockResult);

      const result = await controller.submitForm(
        'org_1',
        mockAuthContext,
        'security-awareness',
        body,
      );

      expect(result).toEqual(mockResult);
      expect(service.submitForm).toHaveBeenCalledWith({
        organizationId: 'org_1',
        formType: 'security-awareness',
        payload: body,
        authContext: mockAuthContext,
      });
    });
  });

  describe('uploadSubmission', () => {
    it('should call service.uploadSubmission with correct params', async () => {
      const body = { fileUrl: 'https://example.com/file.pdf' };
      const mockResult = { id: 'sub_upload' };
      mockService.uploadSubmission.mockResolvedValue(mockResult);

      const result = await controller.uploadSubmission(
        'org_1',
        mockAuthContext,
        'security-awareness',
        body,
      );

      expect(result).toEqual(mockResult);
      expect(service.uploadSubmission).toHaveBeenCalledWith({
        organizationId: 'org_1',
        formType: 'security-awareness',
        authContext: mockAuthContext,
        payload: body,
      });
    });
  });

  describe('reviewSubmission', () => {
    it('should call service.reviewSubmission with correct params', async () => {
      const body = { status: 'approved' };
      const mockResult = { id: 'sub_1', status: 'approved' };
      mockService.reviewSubmission.mockResolvedValue(mockResult);

      const result = await controller.reviewSubmission(
        'org_1',
        mockAuthContext,
        'security-awareness',
        'sub_1',
        body,
      );

      expect(result).toEqual(mockResult);
      expect(service.reviewSubmission).toHaveBeenCalledWith({
        organizationId: 'org_1',
        formType: 'security-awareness',
        submissionId: 'sub_1',
        payload: body,
        authContext: mockAuthContext,
      });
    });
  });

  describe('uploadFile', () => {
    it('should call service.uploadFile with correct params', async () => {
      const body = { fileName: 'test.pdf', contentType: 'application/pdf' };
      const mockResult = { uploadUrl: 'https://s3.example.com/upload' };
      mockService.uploadFile.mockResolvedValue(mockResult);

      const result = await controller.uploadFile(
        'org_1',
        mockAuthContext,
        body,
      );

      expect(result).toEqual(mockResult);
      expect(service.uploadFile).toHaveBeenCalledWith({
        organizationId: 'org_1',
        authContext: mockAuthContext,
        payload: body,
      });
    });
  });

  describe('exportCsv', () => {
    it('should call service.exportCsv and set response headers', async () => {
      const csvContent = 'col1,col2\nval1,val2';
      mockService.exportCsv.mockResolvedValue(csvContent);

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.exportCsv(
        'org_1',
        mockAuthContext,
        'security-awareness',
        mockRes as never,
      );

      expect(service.exportCsv).toHaveBeenCalledWith({
        organizationId: 'org_1',
        authContext: mockAuthContext,
        formType: 'security-awareness',
      });
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('security-awareness-submissions-'),
      );
      expect(mockRes.send).toHaveBeenCalledWith(csvContent);
    });
  });
});
