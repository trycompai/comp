jest.mock('@db', () => ({
  ...jest.requireActual('@prisma/client'),
  db: {},
}));

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

import { AttachmentEntityType, AttachmentType } from '@db';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext as AuthContextType } from '../auth/types';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './create-attachment.dto';

describe('AttachmentsController', () => {
  let controller: AttachmentsController;
  let attachmentsService: jest.Mocked<AttachmentsService>;

  const mockAttachmentsService = {
    getAttachmentDownloadUrl: jest.fn(),
    uploadAttachment: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const baseUploadDto: CreateAttachmentDto = {
    entityId: 'tsk_abc123',
    entityType: AttachmentEntityType.task,
    fileName: 'document.pdf',
    fileType: 'application/pdf',
    fileData:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  };

  const uploadResult = {
    id: 'att_abc123',
    name: 'document.pdf',
    type: AttachmentType.document,
    downloadUrl: 'https://bucket.s3.amazonaws.com/path/file.pdf?sig=abc',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    size: 1024,
  };

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

  describe('createAttachment', () => {
    it('uses authContext.userId for session auth', async () => {
      mockAttachmentsService.uploadAttachment.mockResolvedValue(uploadResult);

      const authContext = {
        organizationId: 'org_123',
        userId: 'usr_session',
        isApiKey: false,
      } as AuthContextType;

      const result = await controller.createAttachment(
        authContext,
        baseUploadDto,
      );

      expect(attachmentsService.uploadAttachment).toHaveBeenCalledWith(
        'org_123',
        'tsk_abc123',
        AttachmentEntityType.task,
        {
          fileName: baseUploadDto.fileName,
          fileType: baseUploadDto.fileType,
          fileData: baseUploadDto.fileData,
          description: undefined,
        },
        'usr_session',
      );
      expect(result).toEqual(uploadResult);
    });

    it('uses body.userId for API key auth', async () => {
      mockAttachmentsService.uploadAttachment.mockResolvedValue(uploadResult);

      const authContext = {
        organizationId: 'org_123',
        isApiKey: true,
      } as AuthContextType;

      await controller.createAttachment(authContext, {
        ...baseUploadDto,
        userId: 'usr_from_body',
      });

      expect(attachmentsService.uploadAttachment).toHaveBeenCalledWith(
        'org_123',
        'tsk_abc123',
        AttachmentEntityType.task,
        expect.any(Object),
        'usr_from_body',
      );
    });

    it('throws BadRequestException when API key auth has no userId in body', async () => {
      const authContext = {
        organizationId: 'org_123',
        isApiKey: true,
      } as AuthContextType;

      await expect(
        controller.createAttachment(authContext, baseUploadDto),
      ).rejects.toThrow(BadRequestException);
      expect(attachmentsService.uploadAttachment).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when session auth has no userId', async () => {
      const authContext = {
        organizationId: 'org_123',
        isApiKey: false,
      } as AuthContextType;

      await expect(
        controller.createAttachment(authContext, baseUploadDto),
      ).rejects.toThrow(BadRequestException);
      expect(attachmentsService.uploadAttachment).not.toHaveBeenCalled();
    });

    it('forwards description to the service', async () => {
      mockAttachmentsService.uploadAttachment.mockResolvedValue(uploadResult);

      const authContext = {
        organizationId: 'org_123',
        userId: 'usr_session',
        isApiKey: false,
      } as AuthContextType;

      await controller.createAttachment(authContext, {
        ...baseUploadDto,
        description: 'Q4 audit evidence',
      });

      expect(attachmentsService.uploadAttachment).toHaveBeenCalledWith(
        'org_123',
        'tsk_abc123',
        AttachmentEntityType.task,
        expect.objectContaining({ description: 'Q4 audit evidence' }),
        'usr_session',
      );
    });

    it('propagates errors from the service', async () => {
      mockAttachmentsService.uploadAttachment.mockRejectedValue(
        new BadRequestException('File size exceeds maximum allowed size'),
      );

      const authContext = {
        organizationId: 'org_123',
        userId: 'usr_session',
        isApiKey: false,
      } as AuthContextType;

      await expect(
        controller.createAttachment(authContext, baseUploadDto),
      ).rejects.toThrow('File size exceeds maximum allowed size');
    });
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
