import { BadRequestException } from '@nestjs/common';

// Mocks must be declared before importing the service under test.
jest.mock('@/app/s3', () => ({
  s3Client: { send: jest.fn().mockResolvedValue({}) },
  getSignedUrl: jest.fn().mockResolvedValue('https://signed.example/file'),
}));

jest.mock('@db', () => ({
  db: { attachment: { create: jest.fn() } },
  AttachmentType: {
    image: 'image',
    video: 'video',
    audio: 'audio',
    document: 'document',
    other: 'other',
  },
  AttachmentEntityType: { task: 'task', offboarding_checklist: 'offboarding_checklist' },
}));

jest.mock('../utils/file-type-validation', () => ({
  validateFileContent: jest.fn(),
}));

import { db } from '@db';
import { AttachmentsService } from './attachments.service';

const mockUploadsService = { readUploadAsBase64: jest.fn() };

describe('AttachmentsService — presigned s3Key uploads', () => {
  let service: AttachmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APP_AWS_BUCKET_NAME = 'test-bucket';
    service = new AttachmentsService(mockUploadsService as never);
  });

  it('resolves the file from s3Key (presigned) — no base64 through the LLM — and uploads it', async () => {
    mockUploadsService.readUploadAsBase64.mockResolvedValue(
      Buffer.from('hello world').toString('base64'),
    );
    (db.attachment.create as jest.Mock).mockResolvedValue({
      id: 'att_1',
      name: 'rbac.pdf',
      type: 'document',
      url: 'org_1/attachments/task/tsk_1/key',
      createdAt: new Date(),
    });

    const result = await service.uploadAttachment(
      'org_1',
      'tsk_1',
      'task' as never,
      {
        fileName: 'rbac.pdf',
        fileType: 'application/pdf',
        s3Key: 'org_1/uploads/attachment/123-rbac.pdf',
      } as never,
      'usr_1',
    );

    // Fetched the bytes from the org-scoped presigned key instead of base64.
    expect(mockUploadsService.readUploadAsBase64).toHaveBeenCalledWith(
      'org_1',
      'org_1/uploads/attachment/123-rbac.pdf',
    );
    expect(db.attachment.create).toHaveBeenCalled();
    expect(result.id).toBe('att_1');
  });

  it('throws when neither fileData nor s3Key is provided', async () => {
    await expect(
      service.uploadAttachment(
        'org_1',
        'tsk_1',
        'task' as never,
        { fileName: 'rbac.pdf', fileType: 'application/pdf' } as never,
        'usr_1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockUploadsService.readUploadAsBase64).not.toHaveBeenCalled();
    expect(db.attachment.create).not.toHaveBeenCalled();
  });
});
