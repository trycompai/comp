import { PDFDocument } from 'pdf-lib';
import {
  appendContextNotesToMarkdown,
  appendContextNotesToPdf,
  type ReportContextNote,
} from './report-appendix.util';

const notes: ReportContextNote[] = [
  {
    issueTitle: 'appConfiguration read access',
    context: 'Accepted by design — non-secret bootstrap config.',
    updatedAt: new Date('2026-06-11T10:00:00.000Z'),
  },
  {
    issueTitle: 'Unverified email access',
    context: 'Email verification is now enabled.',
    updatedAt: new Date('2026-06-10T10:00:00.000Z'),
  },
];

describe('appendContextNotesToMarkdown', () => {
  it('returns the original markdown unchanged when there are no notes', () => {
    const markdown = '# Report\n\nBody.';
    expect(appendContextNotesToMarkdown({ markdown, notes: [] })).toBe(
      markdown,
    );
  });

  it('appends a clearly attributed appendix after the original content', () => {
    const markdown = '# Report\n\nBody.';
    const result = appendContextNotesToMarkdown({ markdown, notes });

    expect(result.startsWith('# Report\n\nBody.')).toBe(true);
    expect(result).toContain(
      '## Appendix: Customer context & management responses',
    );
    expect(result).toContain('not findings or conclusions of the testing team');
    expect(result).toContain('### appConfiguration read access');
    expect(result).toContain('last updated 2026-06-11');
    expect(result).toContain('Accepted by design — non-secret bootstrap config.');
    expect(result).toContain('### Unverified email access');
  });
});

describe('appendContextNotesToPdf', () => {
  async function buildBasePdf(pages = 1): Promise<Buffer> {
    const doc = await PDFDocument.create();
    for (let i = 0; i < pages; i += 1) {
      doc.addPage([595, 842]);
    }
    return Buffer.from(await doc.save());
  }

  it('returns the original bytes untouched when there are no notes', async () => {
    const original = await buildBasePdf();
    const result = await appendContextNotesToPdf({
      pdfBytes: original,
      notes: [],
    });
    expect(result).toBe(original);
  });

  it('appends appendix pages after the original pages', async () => {
    const original = await buildBasePdf(2);
    const result = await appendContextNotesToPdf({
      pdfBytes: original,
      notes,
    });

    const merged = await PDFDocument.load(result);
    expect(merged.getPageCount()).toBeGreaterThanOrEqual(3);
  });

  it('paginates long notes across multiple appendix pages', async () => {
    const original = await buildBasePdf(1);
    const longNote: ReportContextNote = {
      issueTitle: 'Long finding',
      context: Array.from(
        { length: 200 },
        (_, i) => `sentence ${i} with several words to force wrapping.`,
      ).join(' '),
      updatedAt: new Date('2026-06-11T10:00:00.000Z'),
    };

    const result = await appendContextNotesToPdf({
      pdfBytes: original,
      notes: [longNote],
    });

    const merged = await PDFDocument.load(result);
    expect(merged.getPageCount()).toBeGreaterThanOrEqual(3);
  });

  it('tolerates characters outside WinAnsi instead of throwing', async () => {
    const original = await buildBasePdf(1);
    const result = await appendContextNotesToPdf({
      pdfBytes: original,
      notes: [
        {
          issueTitle: 'Unicode “smart” title — with emoji 🚀 and עברית',
          context: 'Curly ‘quotes’, ellipsis… and  nbsp.',
          updatedAt: new Date('2026-06-11T10:00:00.000Z'),
        },
      ],
    });

    const merged = await PDFDocument.load(result);
    expect(merged.getPageCount()).toBe(2);
  });

  it('throws on unparseable provider bytes (caller falls back to original)', async () => {
    await expect(
      appendContextNotesToPdf({
        pdfBytes: Buffer.from('not a pdf at all'),
        notes,
      }),
    ).rejects.toThrow();
  });
});
