import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import {
  metadataLines,
  type IsmsExportIssue,
  type IsmsExportMetadata,
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

function sectionParagraphs({
  heading,
  issues,
  accent,
}: {
  heading: string;
  issues: IsmsExportIssue[];
  accent: string;
}): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text: heading, bold: true, color: accent })],
    }),
  ];

  if (issues.length === 0) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: 'No issues recorded.' })],
      }),
    );
    return paragraphs;
  }

  issues.forEach((issue, index) => {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({ text: `${index + 1}. ${issue.description}`, bold: true }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Effect: ', bold: true }),
          new TextRun({ text: issue.effect }),
        ],
      }),
    );
  });

  return paragraphs;
}

export async function renderIsmsDocx({
  issues,
  metadata,
}: {
  issues: IsmsExportIssue[];
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

  const doc = new Document({
    sections: [
      {
        children: [
          ...header,
          ...metadataParagraphs(metadata),
          ...sectionParagraphs({
            heading: 'External issues',
            issues: issues.filter((issue) => issue.kind === 'external'),
            accent,
          }),
          ...sectionParagraphs({
            heading: 'Internal issues',
            issues: issues.filter((issue) => issue.kind === 'internal'),
            accent,
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
