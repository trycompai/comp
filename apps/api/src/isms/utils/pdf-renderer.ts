import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import {
  metadataRows,
  type IsmsExportMetadata,
  type IsmsExportSection,
  type IsmsKeyValue,
  type IsmsExportTable,
} from './export-shared';

type Rgb = [number, number, number];

const INK: Rgb = [33, 33, 33];
const MUTED: Rgb = [110, 110, 110];
const HAIRLINE: Rgb = [223, 223, 223];
const ZEBRA: Rgb = [247, 247, 247];

/** jsPDF instance once jspdf-autotable has attached its result accessor. */
interface JsPdfWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

function accentColor(hex: string | null): Rgb {
  const fallback: Rgb = [0, 77, 61];
  if (!hex) return fallback;
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return fallback;
  return [r, g, b];
}

/**
 * Render an ISMS document to a polished, auditor-ready PDF: a centred cover
 * block, a metadata table, numbered sections, real bordered tables (the
 * category issue tables and the key/value overview) and a footer carrying the
 * org, classification and page numbers. Mirrors the DOCX renderer's structure.
 */
export function renderIsmsPdf({
  sections,
  metadata,
}: {
  sections: IsmsExportSection[];
  metadata: IsmsExportMetadata;
}): Buffer {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const accent = accentColor(metadata.primaryColor);
  const bottomLimit = pageHeight - 16;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      pdf.addPage();
      y = margin;
    }
  };

  const finalY = (): number =>
    (pdf as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y;

  const writeWrapped = (text: string, style: 'normal' | 'bold') => {
    pdf.setFont('helvetica', style);
    pdf.setFontSize(10.5);
    pdf.setTextColor(...INK);
    for (const line of pdf.splitTextToSize(text, contentWidth)) {
      ensureSpace(6);
      pdf.text(line, margin, y);
      y += 5;
    }
  };

  const writeBullet = (text: string) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10.5);
    pdf.setTextColor(...INK);
    const lines = pdf.splitTextToSize(text, contentWidth - 6);
    lines.forEach((line: string, index: number) => {
      ensureSpace(6);
      if (index === 0) pdf.text('•', margin + 1, y);
      pdf.text(line, margin + 6, y);
      y += 5;
    });
    y += 1;
  };

  const renderKeyValues = (rows: IsmsKeyValue[]) => {
    autoTable(pdf, {
      startY: y,
      margin: { left: margin, right: margin, bottom: 16 },
      theme: 'grid',
      styles: {
        fontSize: 9.5,
        cellPadding: 2.2,
        lineColor: HAIRLINE,
        lineWidth: 0.1,
        textColor: INK,
        valign: 'top',
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 48, fontStyle: 'bold', fillColor: ZEBRA, textColor: MUTED },
        1: { cellWidth: contentWidth - 48 },
      },
      body: rows.map((row) => [row.label, row.value]),
    });
    y = finalY() + 4;
  };

  const renderTable = (table: IsmsExportTable) => {
    const threeCol = table.headers.length === 3;
    autoTable(pdf, {
      startY: y,
      margin: { left: margin, right: margin, bottom: 16 },
      theme: 'grid',
      head: [table.headers],
      body: table.rows,
      styles: {
        fontSize: 9,
        cellPadding: 2.2,
        lineColor: HAIRLINE,
        lineWidth: 0.1,
        textColor: INK,
        valign: 'top',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: accent,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      columnStyles: threeCol
        ? {
            0: { cellWidth: 32, fontStyle: 'bold' },
            1: { cellWidth: 56 },
            2: { cellWidth: contentWidth - 88 },
          }
        : {},
    });
    y = finalY() + 4;
  };

  const renderSection = (section: IsmsExportSection) => {
    ensureSpace(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(...accent);
    pdf.text(section.heading, margin, y);
    y += 7;

    const hasContent =
      Boolean(section.intro) ||
      Boolean(section.paragraphs?.length) ||
      Boolean(section.bullets?.length) ||
      Boolean(section.keyValues?.length) ||
      Boolean(section.table && section.table.rows.length);

    if (!hasContent) {
      writeWrapped(section.emptyText ?? 'No entries recorded.', 'normal');
      y += 4;
      return;
    }

    if (section.intro) {
      writeWrapped(section.intro, 'normal');
      y += 2;
    }
    for (const paragraph of section.paragraphs ?? []) {
      const text = paragraph.label
        ? `${paragraph.label}${paragraph.text}`
        : paragraph.text;
      writeWrapped(text, paragraph.bold ? 'bold' : 'normal');
      y += 1.5;
    }
    for (const bullet of section.bullets ?? []) writeBullet(bullet);
    if (section.keyValues?.length) renderKeyValues(section.keyValues);
    if (section.table && section.table.rows.length) renderTable(section.table);
    y += 4;
  };

  drawCover();
  renderMetadataTable();
  for (const section of sections) renderSection(section);
  drawFooters();

  return Buffer.from(pdf.output('arraybuffer'));

  function drawCover() {
    const centerX = pageWidth / 2;
    y = 32;
    if (metadata.organizationName) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(...INK);
      pdf.text(metadata.organizationName, centerX, y, { align: 'center' });
      y += 8;
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(...MUTED);
    pdf.text(metadata.standardLabel, centerX, y, { align: 'center' });
    y += 13;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(...accent);
    const titleLines = pdf.splitTextToSize(metadata.title, contentWidth);
    pdf.text(titleLines, centerX, y, { align: 'center' });
    y += titleLines.length * 9 + 1;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(...MUTED);
    pdf.text(`Clause ${metadata.clause}`, centerX, y, { align: 'center' });
    y += 13;
  }

  function renderMetadataTable() {
    autoTable(pdf, {
      startY: y,
      margin: { left: margin, right: margin, bottom: 16 },
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2.2,
        lineColor: HAIRLINE,
        lineWidth: 0.1,
        textColor: INK,
        valign: 'top',
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 42, fontStyle: 'bold', fillColor: ZEBRA, textColor: MUTED },
        1: { cellWidth: contentWidth - 42 },
      },
      body: metadataRows(metadata).map((row) => [row.label, row.value]),
    });
    y = finalY() + 10;
  }

  function drawFooters() {
    const pageCount = pdf.getNumberOfPages();
    const footerY = pageHeight - 9;
    const left = [metadata.organizationName, metadata.classification]
      .filter(Boolean)
      .join('  ·  ');
    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.setDrawColor(...HAIRLINE);
      pdf.setLineWidth(0.1);
      pdf.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
      if (left) pdf.text(left, margin, footerY);
      pdf.text(
        `${metadata.documentCode}  ·  Page ${page} of ${pageCount}`,
        pageWidth - margin,
        footerY,
        { align: 'right' },
      );
    }
  }
}
