import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import {
  metadataLines,
  type IsmsExportMetadata,
  type IsmsExportParagraph,
  type IsmsExportSection,
} from './export-shared';

const DEFAULT_ACCENT = '004D3D';

function normalizeHexColor(hex: string | null): string {
  if (!hex) return DEFAULT_ACCENT;
  const clean = hex.replace('#', '').trim();
  return /^[0-9a-fA-F]{6}$/.test(clean) ? clean.toUpperCase() : DEFAULT_ACCENT;
}

function metadataParagraphs(metadata: IsmsExportMetadata): Paragraph[] {
  return metadataLines(metadata).map(
    (text) =>
      new Paragraph({
        children: [new TextRun({ text, color: '505050', size: 20 })],
      }),
  );
}

function paragraphRuns(paragraph: IsmsExportParagraph): TextRun[] {
  const runs: TextRun[] = [];
  if (paragraph.label) {
    runs.push(new TextRun({ text: paragraph.label, bold: true }));
  }
  runs.push(new TextRun({ text: paragraph.text, bold: paragraph.bold }));
  return runs;
}

function tableElement({
  table,
  accent,
}: {
  table: NonNullable<IsmsExportSection['table']>;
  accent: string;
}): Table {
  const headerRow = new TableRow({
    children: table.headers.map(
      (header) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: header, bold: true, color: accent }),
              ],
            }),
          ],
        }),
    ),
  });
  const bodyRows = table.rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: cell })] }),
              ],
            }),
        ),
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });
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
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({ text: section.heading, bold: true, color: accent }),
      ],
    }),
  ];

  const hasParagraphs = section.paragraphs && section.paragraphs.length > 0;
  const hasTable = section.table && section.table.rows.length > 0;

  if (!hasParagraphs && !hasTable) {
    elements.push(
      new Paragraph({
        children: [
          new TextRun({ text: section.emptyText ?? 'No entries recorded.' }),
        ],
      }),
    );
    return elements;
  }

  for (const paragraph of section.paragraphs ?? []) {
    elements.push(
      new Paragraph({
        spacing: { before: 80 },
        children: paragraphRuns(paragraph),
      }),
    );
  }

  if (hasTable && section.table) {
    elements.push(tableElement({ table: section.table, accent }));
  }

  return elements;
}

export async function renderIsmsDocx({
  sections,
  metadata,
}: {
  sections: IsmsExportSection[];
  metadata: IsmsExportMetadata;
}): Promise<Buffer> {
  const accent = normalizeHexColor(metadata.primaryColor);

  const header: Paragraph[] = [];
  if (metadata.organizationName) {
    header.push(
      new Paragraph({
        children: [
          new TextRun({
            text: metadata.organizationName,
            bold: true,
            color: accent,
            size: 28,
          }),
        ],
      }),
    );
  }
  header.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
      children: [new TextRun({ text: metadata.title, bold: true })],
    }),
  );

  const body = sections.flatMap((section) =>
    sectionElements({ section, accent }),
  );

  const doc = new Document({
    sections: [
      {
        children: [...header, ...metadataParagraphs(metadata), ...body],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
