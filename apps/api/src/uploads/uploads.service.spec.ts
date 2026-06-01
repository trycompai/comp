import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadPurpose } from './dto/create-upload-url.dto';

jest.mock('../app/s3', () => ({
  BUCKET_NAME: 'test-bucket',
  s3Client: { send: jest.fn() },
  getSignedUrl: jest.fn(async () => 'https://test-bucket.s3.amazonaws.com/signed'),
  getObjectAsBuffer: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const s3 = require('../app/s3') as {
  getSignedUrl: jest.Mock;
  getObjectAsBuffer: jest.Mock;
};

describe('UploadsService', () => {
  let service: UploadsService;
  const orgId = 'org_abc';

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadsService],
    }).compile();
    service = module.get<UploadsService>(UploadsService);
  });

  describe('createUploadUrl', () => {
    it('returns a presigned URL and an org+purpose-scoped key', async () => {
      const result = await service.createUploadUrl(orgId, {
        purpose: UploadPurpose.questionnaire,
        fileName: 'My Questionnaire.xlsx',
        fileType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      expect(result.uploadUrl).toBe('https://test-bucket.s3.amazonaws.com/signed');
      expect(
        result.s3Key.startsWith(`${orgId}/uploads/questionnaire/`),
      ).toBe(true);
      expect(result.s3Key).toContain('My_Questionnaire.xlsx'); // sanitized
      expect(result.expiresIn).toBe(900);
    });

    it('sanitizes unsafe filename characters so no path traversal is possible', async () => {
      const result = await service.createUploadUrl(orgId, {
        purpose: UploadPurpose.evidence,
        fileName: '../../etc/passwd; rm -rf',
        fileType: 'text/plain',
      });
      const prefix = `${orgId}/uploads/evidence/`;
      expect(result.s3Key.startsWith(prefix)).toBe(true);
      // Slashes are stripped from the filename, so the key cannot escape its
      // prefix or introduce new path segments (literal dots are harmless in a
      // flat S3 key).
      const filenamePart = result.s3Key.slice(prefix.length);
      expect(filenamePart).not.toContain('/');
    });
  });

  describe('assertKeyBelongsToOrg', () => {
    it('accepts a key under the org/uploads prefix', () => {
      expect(() =>
        service.assertKeyBelongsToOrg(orgId, `${orgId}/uploads/questionnaire/x.pdf`),
      ).not.toThrow();
    });

    it('rejects a key from another org', () => {
      expect(() =>
        service.assertKeyBelongsToOrg(orgId, 'other_org/uploads/questionnaire/x.pdf'),
      ).toThrow(BadRequestException);
    });

    it('rejects a key outside the uploads area', () => {
      expect(() =>
        service.assertKeyBelongsToOrg(orgId, `${orgId}/policies/secret.pdf`),
      ).toThrow(BadRequestException);
    });
  });

  describe('readUploadAsBase64', () => {
    it('fetches the object and returns base64 for a valid org key', async () => {
      s3.getObjectAsBuffer.mockResolvedValueOnce(Buffer.from('hello world'));

      const result = await service.readUploadAsBase64(
        orgId,
        `${orgId}/uploads/questionnaire/123-q.csv`,
      );

      expect(result).toBe(Buffer.from('hello world').toString('base64'));
    });

    it('rejects a cross-org key before hitting S3', async () => {
      await expect(
        service.readUploadAsBase64(orgId, 'other_org/uploads/questionnaire/x.csv'),
      ).rejects.toThrow(/does not belong to this organization/);
      expect(s3.getObjectAsBuffer).not.toHaveBeenCalled();
    });

    it('throws a clear error when the object is missing in S3', async () => {
      s3.getObjectAsBuffer.mockRejectedValueOnce(new Error('NoSuchKey'));

      await expect(
        service.readUploadAsBase64(orgId, `${orgId}/uploads/questionnaire/missing.csv`),
      ).rejects.toThrow(/No file found/);
    });
  });
});
