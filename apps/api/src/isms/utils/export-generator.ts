import { jsPDF } from 'jspdf';
import { renderIsmsDocx } from './docx-renderer';
import {
  DOCX_MIME_TYPE,
  metadataLines,
  type IsmsExportFormat,
  type IsmsExportIssue,
  type IsmsExportMetadata,
  type IsmsExportResult,
} from './export-shared';

export type {
  IsmsExportFormat,
  IsmsExportIssue,
  IsmsExportMetadata,
  IsmsExportResult,
} from './export-shared';

export async function generateIsmsExportFile({
  issues,
  metadata,
  format,
}: {
  issues: IsmsExportIssue[];
  metadata: IsmsExportMetadata;
  format: IsmsExportFormat;
}): Promise<IsmsExportResult> {
  const baseName = `${sanitizeName(metadata.title)}-v${metadata.version}`;

  if (format === 'docx') {
    return {
      fileBuffer: await renderIsmsDocx({ issues, metadata }),
      mimeType: DOCX_MIME_TYPE,
      filename: `${baseName}.docx`,
    };
  }

  return {
    fileBuffer: generateIsmsPdf({ issues, metadata }),
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
  issues,
  metadata,
}: {
  issues: IsmsExportIssue[];
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
    if (lines.length === 0) return;
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

  writeSection({
    heading: 'External issues',
    issues: issues.filter((issue) => issue.kind === 'external'),
  });
  writeSection({
    heading: 'Internal issues',
    issues: issues.filter((issue) => issue.kind === 'internal'),
  });

  function writeSection({
    heading,
    issues: sectionIssues,
  }: {
    heading: string;
    issues: IsmsExportIssue[];
  }) {
    pdf.setTextColor(accent.r, accent.g, accent.b);
    pdf.setFontSize(13);
    ensureSpace(lineHeight * 1.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(heading, margin, y);
    y += lineHeight * 1.4;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);

    if (sectionIssues.length === 0) {
      writeLines(['No issues recorded.']);
      y += lineHeight * 0.5;
      return;
    }

    sectionIssues.forEach((issue, index) => {
      const title = `${index + 1}. ${issue.description}`;
      writeLines(pdf.splitTextToSize(title, contentWidth), 'bold');
      writeLines(
        pdf.splitTextToSize(`Effect: ${issue.effect}`, contentWidth),
      );
      ensureSpace(lineHeight * 0.5);
      y += lineHeight * 0.5;
    });
  }

  return Buffer.from(pdf.output('arraybuffer'));
}

function sanitizeName(name: string): string {
  return (name || 'isms-document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
