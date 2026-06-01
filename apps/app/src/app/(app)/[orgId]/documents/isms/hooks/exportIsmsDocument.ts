import { toast } from 'sonner';
import { env } from '@/env.mjs';
import type { IsmsExportFormat } from '../isms-types';

interface ExportIsmsDocumentParams {
  documentId: string;
  format: IsmsExportFormat;
}

/** Downloads an ISMS document export (pdf/docx/md) via the API and triggers a browser save. */
export async function exportIsmsDocument({
  documentId,
  format,
}: ExportIsmsDocumentParams): Promise<void> {
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/v1/isms/documents/${documentId}/export`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to export document');
  }

  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = `isms-document.${format}`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="(.+)"/);
    if (match) filename = match[1];
  }

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
