import type { IsmsContextIssueKind } from '@db';

export type IsmsExportFormat = 'pdf' | 'docx';

export interface IsmsExportIssue {
  kind: IsmsContextIssueKind;
  description: string;
  effect: string;
}

export interface IsmsExportMetadata {
  title: string;
  /** ISO clause this document satisfies, e.g. "4.1". */
  clause: string;
  /** Short human document code, e.g. "CAI-ISMS-001". */
  documentCode: string;
  /** Formal standard label for the cover, e.g. "ISO/IEC 27001:2022". */
  standardLabel: string;
  frameworkName: string;
  version: number;
  preparedBy: string | null;
  /** The role/person accountable for the document. */
  owner: string | null;
  status: string | null;
  approverName: string | null;
  approvedAt: Date | string | null;
  declinedAt: Date | string | null;
  /** Information classification, e.g. "Internal". */
  classification: string;
  /** Review cadence sentence, e.g. "Annual, or on material change". */
  nextReview: string;
  /** Effective/issue date shown in the metadata table. */
  issueDate: Date | string | null;
  organizationName: string | null;
  primaryColor: string | null;
}

export interface IsmsExportResult {
  fileBuffer: Buffer;
  mimeType: string;
  filename: string;
}

/** A label/value pair — used by the metadata table and key/value overview. */
export interface IsmsKeyValue {
  label: string;
  value: string;
}

/**
 * A heading plus any combination of content blocks, rendered in this order:
 * intro → paragraphs → bullets → key/value table → data table. The unit of
 * every export; both the PDF and DOCX renderers consume the same shape.
 */
export interface IsmsExportSection {
  heading: string;
  /** Optional lead-in paragraph rendered directly under the heading. */
  intro?: string;
  /** Free-text paragraphs. */
  paragraphs?: IsmsExportParagraph[];
  /** Bullet-list items. */
  bullets?: string[];
  /** Label/value pairs rendered as a 2-column overview table. */
  keyValues?: IsmsKeyValue[];
  /** Tabular content (registers + the category issue tables render here). */
  table?: IsmsExportTable;
  /** Shown (instead of any content) when the section is empty. */
  emptyText?: string;
}

export interface IsmsExportParagraph {
  /** Optional bold lead-in label, e.g. "Effect: ". */
  label?: string;
  text: string;
  /** Render the whole paragraph bold (used for numbered list titles). */
  bold?: boolean;
}

export interface IsmsExportTable {
  headers: string[];
  rows: string[][];
}

export const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Map a framework name to its formal standard label for the cover page. */
const STANDARD_LABELS: Record<string, string> = {
  'ISO 27001': 'ISO/IEC 27001:2022',
  'ISO 27001:2022': 'ISO/IEC 27001:2022',
  'ISO 27001:2013': 'ISO/IEC 27001:2013',
  'SOC 2': 'SOC 2',
  GDPR: 'GDPR',
  HIPAA: 'HIPAA',
  'PCI DSS': 'PCI DSS',
};

export function standardLabel(frameworkName: string): string {
  return STANDARD_LABELS[frameworkName] ?? frameworkName;
}

/** Format a date as YYYY-MM-DD (deterministic; matches the reference document). */
export function formatExportDate(value: Date | string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toISOString().slice(0, 10);
}

function humanStatus(status: string | null): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'needs_review':
      return 'Pending approval';
    case 'declined':
      return 'Declined';
    case 'draft':
      return 'Draft';
    default:
      return status ? status : 'Draft';
  }
}

/** "v2 · APPROVED" — the version cell of the metadata table. */
export function versionLabel(metadata: IsmsExportMetadata): string {
  return `v${metadata.version} · ${humanStatus(metadata.status).toUpperCase()}`;
}

/** Human-readable approval status used in the metadata table. */
export function approvalLine(metadata: IsmsExportMetadata): string {
  if (metadata.approvedAt) {
    return `Approved on ${formatExportDate(metadata.approvedAt)}`;
  }
  if (metadata.declinedAt) {
    return `Declined on ${formatExportDate(metadata.declinedAt)}`;
  }
  if (metadata.status === 'needs_review') return 'Pending approval';
  return 'Not approved';
}

/** The key/value rows of the cover metadata table (shared by PDF + DOCX). */
export function metadataRows(metadata: IsmsExportMetadata): IsmsKeyValue[] {
  return [
    { label: 'Document ID', value: metadata.documentCode },
    { label: 'Document title', value: metadata.title },
    {
      label: 'Clause reference',
      value: `${metadata.standardLabel}, Clause ${metadata.clause}`,
    },
    { label: 'Version', value: versionLabel(metadata) },
    { label: 'Issue date', value: formatExportDate(metadata.issueDate) },
    { label: 'Owner', value: metadata.owner || metadata.preparedBy || 'Comp AI' },
    { label: 'Approver', value: metadata.approverName || '—' },
    { label: 'Approval status', value: approvalLine(metadata) },
    { label: 'Classification', value: metadata.classification },
    { label: 'Next review', value: metadata.nextReview },
  ];
}
