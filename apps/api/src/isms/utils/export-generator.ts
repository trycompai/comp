import { jsPDF } from 'jspdf';
import { renderIsmsDocx } from './docx-renderer';
import {
  DOCX_MIME_TYPE,
  metadataLines,
  type IsmsExportFormat,
  type IsmsExportMetadata,
  type IsmsExportResult,
  type IsmsExportSection,
} from './export-shared';

export type {
  IsmsExportFormat,
  IsmsExportIssue,
  IsmsExportMetadata,
  IsmsExportResult,
  IsmsExportSection,
} from './export-shared';

export async function generateIsmsExportFile({
  sections,
  metadata,
  format,
}: {
  sections: IsmsExportSection[];
  metadata: IsmsExportMetadata;
  format: IsmsExportFormat;
}): Promise<IsmsExportResult> {
  const baseName = `${sanitizeName(metadata.title)}-v${metadata.version}`;

  if (format === 'docx') {
    return {
      fileBuffer: await renderIsmsDocx({ sections, metadata }),
      mimeType: DOCX_MIME_TYPE,
      filename: `${baseName}.docx`,
    };
  }

  return {
    fileBuffer: generateIsmsPdf({ sections, metadata }),
    mimeType: 'application/pdf',
    filename: `${baseName}.pdf`,
  };
}

function hexToRgb(hex: string | null): { r: number; g: number; b: number } {
  const fallback = { r: 0, g: 77, b: 61 };
  if (!hex) return fallback;
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return fallback;
  return { r, g, b };
}

function generateIsmsPdf({
  sections,
  metadata,
}: {
  sections: IsmsExportSection[];
  metadata: IsmsExportMetadata;
}): Buffer {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 7;
  let y = margin;
  const accent = hexToRgb(metadata.primaryColor);

  const ensureSpace = (required: number) => {
    if (y + required > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };
  const writeLines = (
    lines: string[],
    fontStyle: 'normal' | 'bold' = 'normal',
  ) => {
    pdf.setFont('helvetica', fontStyle);
    for (const line of lines) {
      ensureSpace(lineHeight);
      pdf.text(line, margin, y);
      y += lineHeight;
    }
  };

  // Branded accent bar + organization name.
  pdf.setLineWidth(3);
  pdf.setDrawColor(accent.r, accent.g, accent.b);
  pdf.line(margin, y, pageWidth - margin, y);
  y += lineHeight * 1.5;

  if (metadata.organizationName) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(0, 0, 0);
    pdf.text(metadata.organizationName, margin, y);
    y += lineHeight * 1.5;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.text(metadata.title, margin, y);
  y += lineHeight * 1.8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);
  for (const line of metadataLines(metadata)) {
    pdf.text(line, margin, y);
    y += lineHeight;
  }
  y += lineHeight;

  for (const section of sections) {
    writeSection(section);
  }

  function writeSection(section: IsmsExportSection) {
    pdf.setTextColor(accent.r, accent.g, accent.b);
    pdf.setFontSize(13);
    ensureSpace(lineHeight * 1.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(section.heading, margin, y);
    y += lineHeight * 1.4;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);

    const hasParagraphs = section.paragraphs && section.paragraphs.length > 0;
    const hasTable = section.table && section.table.rows.length > 0;

    if (!hasParagraphs && !hasTable) {
      writeLines([section.emptyText ?? 'No entries recorded.']);
      y += lineHeight * 0.5;
      return;
    }

    for (const paragraph of section.paragraphs ?? []) {
      const text = paragraph.label
        ? `${paragraph.label}${paragraph.text}`
        : paragraph.text;
      writeLines(
        pdf.splitTextToSize(text, contentWidth),
        paragraph.bold ? 'bold' : 'normal',
      );
    }

    if (hasTable && section.table) {
      writeTable(section.table);
    }
    y += lineHeight * 0.5;
  }

  function writeTable(table: NonNullable<IsmsExportSection['table']>) {
    writeLines([table.headers.join('  |  ')], 'bold');
    for (const row of table.rows) {
      row.forEach((cell, index) => {
        const text = `${table.headers[index] ?? ''}: ${cell}`;
        writeLines(pdf.splitTextToSize(text, contentWidth));
      });
      y += lineHeight * 0.4;
    }
  }

  return Buffer.from(pdf.output('arraybuffer'));
}

function sanitizeName(name: string): string {
  return (name || 'isms-document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
