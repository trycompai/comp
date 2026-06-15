import type { IsmsDocumentType } from '@db';
import { ISMS_TYPE_DEFINITIONS } from './document-types';
import { standardLabel, type IsmsExportMetadata } from './export-shared';

const DEFAULT_CLASSIFICATION = 'Internal';
const DEFAULT_NEXT_REVIEW = 'Annual, or on material change';
const DEFAULT_OWNER = 'Security & Privacy Owner';

/** A short org code for the document ID, e.g. "Comp AI" -> "CA", "Acme" -> "ACME". */
function orgCode(name: string | null): string {
  const cleaned = (name ?? '').replace(/[^A-Za-z0-9 ]/g, ' ').trim();
  if (!cleaned) return 'ORG';
  const words = cleaned.split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words
    .map((word) => word[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();
}

/** 1-based document number within the ISMS pack (Context of the Organization = 001). */
function documentNumber(type: IsmsDocumentType): string {
  const index = ISMS_TYPE_DEFINITIONS.findIndex((def) => def.type === type);
  return String((index < 0 ? 0 : index) + 1).padStart(3, '0');
}

function clauseFor(type: IsmsDocumentType): string {
  return ISMS_TYPE_DEFINITIONS.find((def) => def.type === type)?.clause ?? '';
}

/**
 * Build the full export metadata (cover block + metadata table) from the stored
 * document and organization. Fields the platform does not yet capture
 * (classification, review cadence, owner) fall back to ISO-sensible defaults.
 */
export function buildExportMetadata({
  type,
  title,
  frameworkName,
  version,
  status,
  preparedBy,
  owner,
  approverName,
  approvedAt,
  declinedAt,
  organizationName,
  primaryColor,
}: {
  type: IsmsDocumentType;
  title: string;
  frameworkName: string;
  version: number;
  status: string | null;
  preparedBy: string | null;
  owner: string | null;
  approverName: string | null;
  approvedAt: Date | null;
  declinedAt: Date | null;
  organizationName: string | null;
  primaryColor: string | null;
}): IsmsExportMetadata {
  return {
    title,
    clause: clauseFor(type),
    documentCode: `${orgCode(organizationName)}-ISMS-${documentNumber(type)}`,
    standardLabel: standardLabel(frameworkName),
    frameworkName,
    version,
    preparedBy,
    owner: owner || preparedBy || DEFAULT_OWNER,
    status,
    approverName,
    approvedAt,
    declinedAt,
    classification: DEFAULT_CLASSIFICATION,
    nextReview: DEFAULT_NEXT_REVIEW,
    issueDate: approvedAt ?? new Date(),
    organizationName,
    primaryColor,
  };
}
