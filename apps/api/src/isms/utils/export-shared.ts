import type { IsmsContextIssueKind } from '@db';

export type IsmsExportFormat = 'pdf' | 'docx';

export interface IsmsExportIssue {
  kind: IsmsContextIssueKind;
  description: string;
  effect: string;
}

export interface IsmsExportMetadata {
  title: string;
  frameworkName: string;
  version: number;
  preparedBy: string | null;
  status: string | null;
  approverName: string | null;
  approvedAt: Date | string | null;
  declinedAt: Date | string | null;
  organizationName: string | null;
  primaryColor: string | null;
}

export interface IsmsExportResult {
  fileBuffer: Buffer;
  mimeType: string;
  filename: string;
}

export const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Human-readable approval status used by both the PDF and DOCX headers. */
export function approvalLine(metadata: IsmsExportMetadata): string {
  if (metadata.approvedAt) {
    return `Approved on ${new Date(metadata.approvedAt).toLocaleDateString()}`;
  }
  if (metadata.declinedAt) {
    return `Declined on ${new Date(metadata.declinedAt).toLocaleDateString()}`;
  }
  if (metadata.status === 'needs_review') return 'Pending approval';
  return 'Not approved';
}

export function metadataLines(metadata: IsmsExportMetadata): string[] {
  return [
    `Framework: ${metadata.frameworkName}`,
    `Version: v${metadata.version}`,
    `Prepared by: ${metadata.preparedBy || 'Comp AI'}`,
    `Approval status: ${approvalLine(metadata)}`,
    `Approver: ${metadata.approverName || 'N/A'}`,
    `Exported: ${new Date().toLocaleDateString()}`,
  ];
}
