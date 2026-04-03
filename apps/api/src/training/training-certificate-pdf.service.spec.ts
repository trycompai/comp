import { TrainingCertificatePdfService } from './training-certificate-pdf.service';

// Mock fetch for logo download
global.fetch = jest.fn().mockResolvedValue({
  ok: false,
}) as unknown as typeof fetch;

describe('TrainingCertificatePdfService', () => {
  let service: TrainingCertificatePdfService;

  beforeEach(() => {
    service = new TrainingCertificatePdfService();
  });

  describe('generateTrainingCertificatePdf', () => {
    it('returns a valid PDF buffer', async () => {
      const result = await service.generateTrainingCertificatePdf({
        userName: 'Jane Doe',
        organizationName: 'Acme Corp',
        completedAt: new Date('2026-01-15'),
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      // PDF magic bytes
      expect(result.subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('handles unicode characters in names', async () => {
      const result = await service.generateTrainingCertificatePdf({
        userName: 'Jos\u00e9 Garc\u00eda',
        organizationName: 'Caf\u00e9 Corp\u2014LLC',
        completedAt: new Date('2026-03-01'),
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('includes completion date in the PDF', async () => {
      const result = await service.generateTrainingCertificatePdf({
        userName: 'Test User',
        organizationName: 'Test Org',
        completedAt: new Date('2026-06-15'),
      });

      const pdfText = result.toString('latin1');
      expect(pdfText).toContain('June');
      expect(pdfText).toContain('2026');
    });

    it('handles logo fetch failure gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const result = await service.generateTrainingCertificatePdf({
        userName: 'Logo User',
        organizationName: 'Logo Org',
        completedAt: new Date('2026-01-01'),
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
