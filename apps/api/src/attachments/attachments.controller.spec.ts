import { Test, TestingModule } from '@nestjs/testing';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('AttachmentsController', () => {
  let controller: AttachmentsController;
  let attachmentsService: jest.Mocked<AttachmentsService>;

  const mockAttachmentsService = {
    getAttachmentDownloadUrl: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttachmentsController],
      providers: [
        { provide: AttachmentsService, useValue: mockAttachmentsService },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<AttachmentsController>(AttachmentsController);
    attachmentsService = module.get(AttachmentsService);

    jest.clearAllMocks();
  });

  describe('getAttachmentDownloadUrl', () => {
    it('should call attachmentsService.getAttachmentDownloadUrl with correct params', async () => {
      const downloadResult = {
        downloadUrl: 'https://bucket.s3.amazonaws.com/file.pdf?sig=abc',
        expiresIn: 900,
      };
      mockAttachmentsService.getAttachmentDownloadUrl.mockResolvedValue(
        downloadResult,
      );

      const result = await controller.getAttachmentDownloadUrl(
        'org_123',
        'att_abc123',
      );

      expect(attachmentsService.getAttachmentDownloadUrl).toHaveBeenCalledWith(
        'org_123',
        'att_abc123',
      );
      expect(result).toEqual(downloadResult);
    });

    it('should propagate errors from the service', async () => {
      mockAttachmentsService.getAttachmentDownloadUrl.mockRejectedValue(
        new Error('Attachment not found'),
      );

      await expect(
        controller.getAttachmentDownloadUrl('org_123', 'att_invalid'),
      ).rejects.toThrow('Attachment not found');
    });
  });
});
