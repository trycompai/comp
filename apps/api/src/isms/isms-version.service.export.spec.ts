import { Logger, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type { AttachmentsService } from '../attachments/attachments.service';
import { IsmsVersionService } from './isms-version.service';
import type { IsmsExportSnapshot } from './utils/export-payload';
import { parseExportSnapshot, renderSnapshot } from './utils/export-payload';

jest.mock('@db', () => ({
  db: {
    ismsDocumentVersion: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('./utils/export-payload', () => ({
  buildExportInput: jest.fn(() => ({ rows: [] })),
  parseExportSnapshot: jest.fn(),
  renderSnapshot: jest.fn(),
  resolveOrgProfile: jest.fn(),
}));
jest.mock('./utils/export-metadata', () => ({
  buildExportMetadata: jest.fn(() => ({ version: 0 })),
}));

const mockDb = jest.mocked(db);
const mockRenderSnapshot = jest.mocked(renderSnapshot);
const mockParse = jest.mocked(parseExportSnapshot);

describe('IsmsVersionService export/render', () => {
  let service: IsmsVersionService;
  const attachments = {
    getObjectBuffer: jest.fn(),
    uploadBuffer: jest.fn(),
  } as unknown as AttachmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    service = new IsmsVersionService(attachments);
  });

  describe('getVersionExport', () => {
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      versionId: 'isms_ver_1',
      format: 'pdf' as const,
    };

    it('throws NotFoundException when the version is missing', async () => {
      (mockDb.ismsDocumentVersion.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(service.getVersionExport(args)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('serves the stored file from S3 when a rendered key exists', async () => {
      (mockDb.ismsDocumentVersion.findFirst as jest.Mock).mockResolvedValue({
        version: 3,
        pdfUrl: 'org/isms/doc/v3.pdf',
        docxUrl: null,
        contentSnapshot: {},
        document: { title: 'Context Doc' },
      });
      const buffer = Buffer.from('stored-pdf');
      (attachments.getObjectBuffer as jest.Mock).mockResolvedValue(buffer);

      const result = await service.getVersionExport(args);

      expect(attachments.getObjectBuffer).toHaveBeenCalledWith(
        'org/isms/doc/v3.pdf',
      );
      expect(result).toEqual({
        fileBuffer: buffer,
        mimeType: 'application/pdf',
        filename: 'context-doc-v3.pdf',
      });
      expect(mockRenderSnapshot).not.toHaveBeenCalled();
    });

    it('re-renders from the content snapshot when no stored file exists', async () => {
      (mockDb.ismsDocumentVersion.findFirst as jest.Mock).mockResolvedValue({
        version: 2,
        pdfUrl: null,
        docxUrl: null,
        contentSnapshot: { type: 'x' },
        document: { title: 'Doc' },
      });
      const snapshot = { type: 'x' } as unknown as IsmsExportSnapshot;
      mockParse.mockReturnValue(snapshot);
      const rendered = {
        fileBuffer: Buffer.from('re'),
        mimeType: 'application/pdf',
        filename: 'doc-v2.pdf',
      };
      mockRenderSnapshot.mockResolvedValue(rendered);

      const result = await service.getVersionExport(args);

      expect(attachments.getObjectBuffer).not.toHaveBeenCalled();
      expect(mockRenderSnapshot).toHaveBeenCalledWith(snapshot, 'pdf');
      expect(result).toBe(rendered);
    });

    it('falls back to the snapshot when the stored S3 object is unavailable', async () => {
      (mockDb.ismsDocumentVersion.findFirst as jest.Mock).mockResolvedValue({
        version: 3,
        pdfUrl: 'org/isms/doc/v3.pdf',
        docxUrl: null,
        contentSnapshot: { type: 'x' },
        document: { title: 'Doc' },
      });
      (attachments.getObjectBuffer as jest.Mock).mockRejectedValue(
        new Error('NoSuchKey'),
      );
      const snapshot = { type: 'x' } as unknown as IsmsExportSnapshot;
      mockParse.mockReturnValue(snapshot);
      const rendered = {
        fileBuffer: Buffer.from('re'),
        mimeType: 'application/pdf',
        filename: 'doc-v3.pdf',
      };
      mockRenderSnapshot.mockResolvedValue(rendered);

      const result = await service.getVersionExport(args);

      expect(attachments.getObjectBuffer).toHaveBeenCalledWith(
        'org/isms/doc/v3.pdf',
      );
      expect(mockRenderSnapshot).toHaveBeenCalledWith(snapshot, 'pdf');
      expect(result).toBe(rendered);
    });

    it('throws when a version has neither a stored file nor a snapshot (never serves live data)', async () => {
      (mockDb.ismsDocumentVersion.findFirst as jest.Mock).mockResolvedValue({
        version: 1,
        pdfUrl: null,
        docxUrl: null,
        contentSnapshot: null,
        document: { title: 'Doc' },
      });
      mockParse.mockReturnValue(null);

      await expect(service.getVersionExport(args)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRenderSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('publishRenders', () => {
    const args = {
      organizationId: 'org_1',
      documentId: 'doc_1',
      versionId: 'isms_ver_1',
      version: 2,
      snapshot: {} as IsmsExportSnapshot,
    };

    it('uploads both formats and patches the version with the keys', async () => {
      mockRenderSnapshot
        .mockResolvedValueOnce({
          fileBuffer: Buffer.from('pdf'),
          mimeType: 'application/pdf',
          filename: 'a.pdf',
        })
        .mockResolvedValueOnce({
          fileBuffer: Buffer.from('docx'),
          mimeType: 'docx-mime',
          filename: 'a.docx',
        });

      await service.publishRenders(args);

      expect(attachments.uploadBuffer).toHaveBeenCalledTimes(2);
      const update = (mockDb.ismsDocumentVersion.update as jest.Mock).mock
        .calls[0][0];
      expect(update.where).toEqual({ id: 'isms_ver_1' });
      expect(update.data.pdfUrl).toEqual(expect.stringContaining('.pdf'));
      expect(update.data.docxUrl).toEqual(expect.stringContaining('.docx'));
    });

    it('swallows render/upload errors and never patches the version', async () => {
      mockRenderSnapshot.mockRejectedValue(new Error('render boom'));

      await expect(service.publishRenders(args)).resolves.toBeUndefined();

      expect(attachments.uploadBuffer).not.toHaveBeenCalled();
      expect(mockDb.ismsDocumentVersion.update).not.toHaveBeenCalled();
    });
  });
});
