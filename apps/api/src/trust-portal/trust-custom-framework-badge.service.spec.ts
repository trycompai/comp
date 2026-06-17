import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { TrustCustomFrameworkBadgeService } from './trust-custom-framework-badge.service';
import { getSignedUrl, s3Client } from '../app/s3';

jest.mock('@db', () => ({
  db: {
    customFramework: { findFirst: jest.fn() },
    trustCustomFramework: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../app/s3', () => ({
  APP_AWS_ORG_ASSETS_BUCKET: 'org-assets',
  s3Client: { send: jest.fn() },
  getSignedUrl: jest.fn(),
}));

const mockDb = db as unknown as {
  customFramework: { findFirst: jest.Mock };
  trustCustomFramework: {
    upsert: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};
const mockS3 = s3Client as unknown as { send: jest.Mock };
const mockGetSignedUrl = getSignedUrl as unknown as jest.Mock;

// "hello" -> 5 bytes: a valid, small, non-empty image payload for the happy path.
const SMALL_BASE64 = 'aGVsbG8=';

describe('TrustCustomFrameworkBadgeService', () => {
  let service: TrustCustomFrameworkBadgeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TrustCustomFrameworkBadgeService();
  });

  describe('uploadBadge', () => {
    const dto = {
      customFrameworkId: 'cfrm_a',
      fileName: 'badge.png',
      fileType: 'image/png',
      fileData: SMALL_BASE64,
    };

    it('throws NotFound when the framework is not in the org (tenant scoping)', async () => {
      mockDb.customFramework.findFirst.mockResolvedValue(null);

      await expect(
        service.uploadBadge('org_1', { ...dto, customFrameworkId: 'cfrm_x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockDb.customFramework.findFirst).toHaveBeenCalledWith({
        where: { id: 'cfrm_x', organizationId: 'org_1' },
        select: { id: true },
      });
      expect(mockS3.send).not.toHaveBeenCalled();
    });

    it('rejects non-image types (e.g. SVG)', async () => {
      mockDb.customFramework.findFirst.mockResolvedValue({ id: 'cfrm_a' });

      await expect(
        service.uploadBadge('org_1', {
          ...dto,
          fileName: 'badge.svg',
          fileType: 'image/svg+xml',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockS3.send).not.toHaveBeenCalled();
    });

    it('rejects a disallowed MIME type even when the extension is allowed', async () => {
      mockDb.customFramework.findFirst.mockResolvedValue({ id: 'cfrm_a' });

      // A ".png" name must not let a non-image MIME through — the MIME is what we
      // store as the S3 ContentType.
      await expect(
        service.uploadBadge('org_1', {
          ...dto,
          fileName: 'badge.png',
          fileType: 'text/html',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockS3.send).not.toHaveBeenCalled();
    });

    it('rejects images larger than 256KB', async () => {
      mockDb.customFramework.findFirst.mockResolvedValue({ id: 'cfrm_a' });
      // 'A' is valid base64; ~400KB of chars decodes to ~300KB > 256KB cap.
      const oversized = 'A'.repeat(400 * 1024);

      await expect(
        service.uploadBadge('org_1', { ...dto, fileData: oversized }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockS3.send).not.toHaveBeenCalled();
    });

    it('uploads, stores the key without publishing, and returns a signed url', async () => {
      mockDb.customFramework.findFirst.mockResolvedValue({ id: 'cfrm_a' });
      mockDb.trustCustomFramework.upsert.mockResolvedValue({});
      mockS3.send.mockResolvedValue({});
      mockGetSignedUrl.mockResolvedValue('https://signed/badge.png');

      const result = await service.uploadBadge('org_1', dto);

      expect(result).toEqual({
        success: true,
        badgeUrl: 'https://signed/badge.png',
      });
      expect(mockS3.send).toHaveBeenCalledTimes(1);

      const upsertArg = mockDb.trustCustomFramework.upsert.mock.calls[0][0];
      expect(upsertArg.where).toEqual({
        organizationId_customFrameworkId: {
          organizationId: 'org_1',
          customFrameworkId: 'cfrm_a',
        },
      });
      // First badge upload must NOT publish the framework.
      expect(upsertArg.create).toMatchObject({
        organizationId: 'org_1',
        customFrameworkId: 'cfrm_a',
        enabled: false,
      });
      expect(upsertArg.create.badgeS3Key).toContain(
        'org_1/trust/custom-framework/cfrm_a/badge/',
      );
      // Replace path only touches the key.
      expect(upsertArg.update).toEqual({
        badgeS3Key: upsertArg.create.badgeS3Key,
      });
    });
  });

  describe('removeBadge', () => {
    it('throws NotFound when no selection exists', async () => {
      mockDb.trustCustomFramework.findUnique.mockResolvedValue(null);

      await expect(
        service.removeBadge('org_1', 'cfrm_a'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockDb.trustCustomFramework.update).not.toHaveBeenCalled();
    });

    it('clears the stored badge key', async () => {
      mockDb.trustCustomFramework.findUnique.mockResolvedValue({
        customFrameworkId: 'cfrm_a',
      });
      mockDb.trustCustomFramework.update.mockResolvedValue({});

      const result = await service.removeBadge('org_1', 'cfrm_a');

      expect(result).toEqual({ success: true });
      expect(mockDb.trustCustomFramework.update).toHaveBeenCalledWith({
        where: {
          organizationId_customFrameworkId: {
            organizationId: 'org_1',
            customFrameworkId: 'cfrm_a',
          },
        },
        data: { badgeS3Key: null },
      });
    });
  });

  describe('signBadgeUrl', () => {
    it('returns a signed url', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed/x.png');

      await expect(service.signBadgeUrl('some/key.png')).resolves.toBe(
        'https://signed/x.png',
      );
    });

    it('returns null when signing fails (graceful fallback to initials)', async () => {
      mockGetSignedUrl.mockRejectedValue(new Error('boom'));

      await expect(service.signBadgeUrl('some/key.png')).resolves.toBeNull();
    });
  });
});
