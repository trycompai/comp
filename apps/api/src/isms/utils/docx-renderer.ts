import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import {
  metadataRows,
  type IsmsExportMetadata,
  type IsmsExportParagraph,
  type IsmsExportSection,
  type IsmsExportTable,
  type IsmsKeyValue,
} from './export-shared';

const DEFAULT_ACCENT = '004D3D';
const INK = '212121';
const MUTED = '6E6E6E';
const HAIRLINE = 'DFDFDF';
const ZEBRA = 'F7F7F7';
const WHITE = 'FFFFFF';

function normalizeHexColor(hex: string | null): string {
  if (!hex) return DEFAULT_ACCENT;
  const clean = hex.replace('#', '').trim();
  return /^[0-9a-fA-F]{6}$/.test(clean) ? clean.toUpperCase() : DEFAULT_ACCENT;
}

const thin = { style: BorderStyle.SINGLE, size: 4, color: HAIRLINE };
const TABLE_BORDERS = {
  top: thin,
  bottom: thin,
  left: thin,
  right: thin,
  insideHorizontal: thin,
  insideVertical: thin,
};

function shaded(fill: string) {
  return { type: ShadingType.CLEAR, fill, color: 'auto' };
}

function cell({
  text,
  bold,
  color,
  fill,
  width,
}: {
  text: string;
  bold?: boolean;
  color?: string;
  fill?: string;
  width?: number;
}): TableCell {
  return new TableCell({
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: fill ? shaded(fill) : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, color: color ?? INK })],
      }),
    ],
  });
}

/** A 2-column label/value table (metadata block + organization overview). */
function keyValueTable(rows: IsmsKeyValue[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2600, 6426],
    borders: TABLE_BORDERS,
    rows: rows.map(
      (row) =>
        new TableRow({
          children: [
            cell({
              text: row.label,
              bold: true,
              color: MUTED,
              fill: ZEBRA,
              width: 2600,
            }),
            cell({ text: row.value, width: 6426 }),
          ],
        }),
    ),
  });
}

/** A bordered data table with a shaded accent header row. */
function dataTable({
  table,
  accent,
}: {
  table: IsmsExportTable;
  accent: string;
}): Table {
  const widths =
    table.headers.length === 3 ? [1900, 3000, 4126] : undefined;
  const headerRow = new TableRow({
    tableHeader: true,
    children: table.headers.map(
      (header, index) =>
        new TableCell({
          width: widths ? { size: widths[index], type: WidthType.DXA } : undefined,
          shading: shaded(accent),
          margins: { top: 60, bottom: 60, left: 90, right: 90 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: header, bold: true, color: WHITE })],
            }),
          ],
        }),
    ),
  });
  const bodyRows = table.rows.map(
    (row, rowIndex) =>
      new TableRow({
        children: row.map((value, index) =>
          cell({
            text: value,
            bold: widths ? index === 0 : false,
            width: widths ? widths[index] : undefined,
            // Per-cell background fills (the 6.1.2 risk level matrix).
            fill: table.cellFills?.[rowIndex]?.[index] ?? undefined,
          }),
        ),
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    borders: TABLE_BORDERS,
    rows: [headerRow, ...bodyRows],
  });
}

function paragraphRuns(paragraph: IsmsExportParagraph): TextRun[] {
  const runs: TextRun[] = [];
  if (paragraph.label) {
    runs.push(new TextRun({ text: paragraph.label, bold: true }));
  }
  runs.push(new TextRun({ text: paragraph.text, bold: paragraph.bold }));
  return runs;
}

function sectionElements({
  section,
  accent,
}: {
  section: IsmsExportSection;
  accent: string;
}): Array<Paragraph | Table> {
  const elements: Array<Paragraph | Table> = [
    new Paragraph({
      spacing: { before: 280, after: 120 },
      children: [
        new TextRun({ text: section.heading, bold: true, color: accent, size: 26 }),
      ],
    }),
  ];

  const hasContent =
    Boolean(section.intro) ||
    Boolean(section.paragraphs?.length) ||
    Boolean(section.bullets?.length) ||
    Boolean(section.keyValues?.length) ||
    Boolean(section.table && section.table.rows.length);

  if (!hasContent) {
    elements.push(
      new Paragraph({
        children: [
          new TextRun({ text: section.emptyText ?? 'No entries recorded.' }),
        ],
      }),
    );
    return elements;
  }

  if (section.intro) {
    elements.push(
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun(section.intro)] }),
    );
  }
  for (const paragraph of section.paragraphs ?? []) {
    elements.push(
      new Paragraph({ spacing: { after: 60 }, children: paragraphRuns(paragraph) }),
    );
  }
  for (const bullet of section.bullets ?? []) {
    elements.push(
      new Paragraph({ bullet: { level: 0 }, children: [new TextRun(bullet)] }),
    );
  }
  if (section.keyValues?.length) elements.push(keyValueTable(section.keyValues));
  if (section.table && section.table.rows.length) {
    elements.push(dataTable({ table: section.table, accent }));
  }

  return elements;
}

function coverBlock(metadata: IsmsExportMetadata): Paragraph[] {
  const center = AlignmentType.CENTER;
  const block: Paragraph[] = [];
  if (metadata.organizationName) {
    block.push(
      new Paragraph({
        alignment: center,
        spacing: { before: 480, after: 80 },
        children: [
          new TextRun({ text: metadata.organizationName, bold: true, size: 26, color: INK }),
        ],
      }),
    );
  }
  block.push(
    new Paragraph({
      alignment: center,
      spacing: { after: 160 },
      children: [new TextRun({ text: metadata.standardLabel, size: 22, color: MUTED })],
    }),
    new Paragraph({
      alignment: center,
      spacing: { after: 60 },
      children: [new TextRun({ text: metadata.title, bold: true, size: 44, color: metadata.primaryColor ? normalizeHexColor(metadata.primaryColor) : DEFAULT_ACCENT })],
    }),
    new Paragraph({
      alignment: center,
      spacing: { after: 320 },
      children: [new TextRun({ text: `Clause ${metadata.clause}`, size: 22, color: MUTED })],
    }),
  );
  return block;
}

function pageFooter(metadata: IsmsExportMetadata): Footer {
  const left = [metadata.organizationName, metadata.classification]
    .filter(Boolean)
    .join('  ·  ');
  return new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: 'right', position: 9026 }],
        children: [
          new TextRun({ text: left, size: 16, color: MUTED }),
          new TextRun({ text: `\t${metadata.documentCode}  ·  Page `, size: 16, color: MUTED }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTED }),
          new TextRun({ text: ' of ', size: 16, color: MUTED }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: MUTED }),
        ],
      }),
    ],
  });
}

/**
 * Render an ISMS document to a polished DOCX matching the PDF: a centred cover
 * block, a metadata table, numbered sections, bullet lists, a key/value
 * overview and bordered data tables with a shaded accent header, plus a footer
 * with the org, classification and page numbers.
 */
export async function renderIsmsDocx({
  sections,
  metadata,
}: {
  sections: IsmsExportSection[];
  metadata: IsmsExportMetadata;
}): Promise<Buffer> {
  const accent = normalizeHexColor(metadata.primaryColor);

  const body: Array<Paragraph | Table> = [
    ...coverBlock(metadata),
    keyValueTable(metadataRows(metadata)),
    ...sections.flatMap((section) => sectionElements({ section, accent })),
  ];

  const doc = new Document({
    sections: [
      {
        footers: { default: pageFooter(metadata) },
        children: body,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
