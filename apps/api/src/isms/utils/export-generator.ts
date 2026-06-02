import { renderIsmsDocx } from './docx-renderer';
import { renderIsmsPdf } from './pdf-renderer';
import {
  DOCX_MIME_TYPE,
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
    fileBuffer: renderIsmsPdf({ sections, metadata }),
    mimeType: 'application/pdf',
    filename: `${baseName}.pdf`,
  };
}

function sanitizeName(name: string): string {
  return (name || 'isms-document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
