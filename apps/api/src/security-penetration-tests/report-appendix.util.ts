import { PDFDocument, PDFFont, rgb, StandardFonts } from 'pdf-lib';

/**
 * Renders the customer's finding-context notes as a clearly attributed
 * appendix on the pentest report artifacts. The original Maced report is
 * never modified in place: markdown gets a section appended after a
 * horizontal rule, the PDF gets extra pages appended after the original
 * ones. Callers MUST treat any thrown error as "serve the original
 * artifact unchanged" — the appendix is additive, never load-bearing.
 */
export interface ReportContextNote {
  issueTitle: string;
  context: string;
  updatedAt: Date;
}

const APPENDIX_TITLE = 'Appendix: Customer context & management responses';
const APPENDIX_DISCLAIMER =
  'The notes below were provided by the customer in Comp AI after testing. ' +
  'They are customer statements, not findings or conclusions of the testing team.';

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function appendContextNotesToMarkdown(params: {
  markdown: string;
  notes: ReportContextNote[];
}): string {
  if (params.notes.length === 0) {
    return params.markdown;
  }

  const sections = params.notes.map(
    (note) =>
      `### ${note.issueTitle.trim()}\n\n` +
      `_Customer note, last updated ${formatDate(note.updatedAt)}:_\n\n` +
      `${note.context.trim()}`,
  );

  return (
    `${params.markdown.trimEnd()}\n\n---\n\n` +
    `## ${APPENDIX_TITLE}\n\n` +
    `_${APPENDIX_DISCLAIMER}_\n\n` +
    `${sections.join('\n\n')}\n`
  );
}

// pdf-lib's standard Helvetica fonts only encode WinAnsi (CP-1252-like).
// Map common typographic characters to ASCII and replace anything else
// outside Latin-1 so drawText can never throw on customer input.
function sanitizePdfText(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\v\f]/g, ' ')
    .replace(/[^\n\x20-\x7E¡-ÿ]/g, '?');
}

// Character-level split for a single token wider than the line (long
// URLs, IDs). Without this the token would be emitted as one overflowing
// line and run off the page margin.
function splitLongWord(params: {
  word: string;
  font: PDFFont;
  fontSize: number;
  maxWidth: number;
}): string[] {
  const parts: string[] = [];
  let current = '';
  for (const char of params.word) {
    const candidate = current + char;
    if (
      params.font.widthOfTextAtSize(candidate, params.fontSize) >
        params.maxWidth &&
      current
    ) {
      parts.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }
  if (current) {
    parts.push(current);
  }
  return parts;
}

/** Exported for tests — every returned line fits within maxWidth. */
export function wrapText(params: {
  text: string;
  font: PDFFont;
  fontSize: number;
  maxWidth: number;
}): string[] {
  const lines: string[] = [];

  for (const paragraph of params.text.split('\n')) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }

    let currentLine = '';
    for (const word of paragraph.split(' ')) {
      const wordWidth = params.font.widthOfTextAtSize(word, params.fontSize);
      if (wordWidth > params.maxWidth) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        const parts = splitLongWord({ ...params, word });
        lines.push(...parts.slice(0, -1));
        currentLine = parts[parts.length - 1] ?? '';
        continue;
      }

      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const candidateWidth = params.font.widthOfTextAtSize(
        candidate,
        params.fontSize,
      );
      if (candidateWidth > params.maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

const PAGE_SIZE: [number, number] = [595, 842]; // A4, matches NdaPdfService
const MARGIN = 56;
const BODY_SIZE = 10;
const BODY_LEADING = 14;

export async function appendContextNotesToPdf(params: {
  pdfBytes: Buffer;
  notes: ReportContextNote[];
}): Promise<Buffer> {
  if (params.notes.length === 0) {
    return params.pdfBytes;
  }

  const pdfDoc = await PDFDocument.load(params.pdfBytes);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const maxWidth = PAGE_SIZE[0] - MARGIN * 2;

  let page = pdfDoc.addPage(PAGE_SIZE);
  let y = PAGE_SIZE[1] - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdfDoc.addPage(PAGE_SIZE);
      y = PAGE_SIZE[1] - MARGIN;
    }
  };

  const drawWrapped = (opts: {
    text: string;
    font: PDFFont;
    size: number;
    leading: number;
    color?: ReturnType<typeof rgb>;
  }) => {
    const lines = wrapText({
      text: sanitizePdfText(opts.text),
      font: opts.font,
      fontSize: opts.size,
      maxWidth,
    });
    for (const line of lines) {
      ensureSpace(opts.leading);
      if (line) {
        page.drawText(line, {
          x: MARGIN,
          y,
          size: opts.size,
          font: opts.font,
          color: opts.color ?? rgb(0.1, 0.1, 0.1),
        });
      }
      y -= opts.leading;
    }
  };

  drawWrapped({
    text: APPENDIX_TITLE,
    font: helveticaBold,
    size: 15,
    leading: 20,
  });
  y -= 4;
  drawWrapped({
    text: APPENDIX_DISCLAIMER,
    font: helvetica,
    size: 9,
    leading: 12,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 12;

  for (const note of params.notes) {
    // Keep at least the title and one body line together on a page.
    ensureSpace(16 + BODY_LEADING * 2);
    drawWrapped({
      text: note.issueTitle.trim(),
      font: helveticaBold,
      size: 11,
      leading: 15,
    });
    drawWrapped({
      text: `Customer note, last updated ${formatDate(note.updatedAt)}`,
      font: helvetica,
      size: 8,
      leading: 11,
      color: rgb(0.45, 0.45, 0.45),
    });
    y -= 2;
    drawWrapped({
      text: note.context.trim(),
      font: helvetica,
      size: BODY_SIZE,
      leading: BODY_LEADING,
    });
    y -= 14;
  }

  return Buffer.from(await pdfDoc.save());
}
