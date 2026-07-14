import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { IsmsExportFormat } from '../isms-types';

interface ExportIsmsDocumentParams {
  documentId: string;
  format: IsmsExportFormat;
  organizationId?: string;
  /**
   * Published version to export. Omit to export the current working draft; provide
   * a version id to download exactly what was approved at that version (CS-701).
   */
  versionId?: string;
}

function parseFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename="(.+)"/);
  return match ? match[1] : fallback;
}

/** Downloads an ISMS document export (pdf/docx) via the API and triggers a browser save. */
export async function exportIsmsDocument({
  documentId,
  format,
  organizationId,
  versionId,
}: ExportIsmsDocumentParams): Promise<void> {
  // Route through the shared apiClient so the request carries the same
  // credentials + organization header context as every other API call.
  const response = await api.raw(`/v1/isms/documents/${documentId}/export`, {
    method: 'POST',
    organizationId,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(versionId ? { format, versionId } : { format }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to export document');
  }

  const filename = parseFilename(
    response.headers.get('Content-Disposition'),
    `isms-document.${format}`,
  );

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  toast.success(`Exported as ${filename}`);
}
