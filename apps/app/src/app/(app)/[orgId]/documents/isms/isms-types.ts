/**
 * Shared client-side types + constants for the ISMS Foundational Documents
 * feature (CS-437). Mirrors the NestJS `/v1/isms` contract and the Prisma
 * IsmsDocument / IsmsContextIssue models.
 */

export type IsmsDocumentType =
  | 'context_of_organization'
  | 'interested_parties_register'
  | 'interested_parties_requirements'
  | 'isms_scope'
  | 'leadership_commitment'
  | 'objectives_plan';

export type IsmsDocumentStatus =
  | 'draft'
  | 'in_progress'
  | 'needs_review'
  | 'approved'
  | 'declined';

export type IsmsContextIssueKind = 'internal' | 'external';
export type IsmsContextSource = 'derived' | 'manual';
export type IsmsExportFormat = 'pdf' | 'docx';

export interface IsmsContextIssue {
  id: string;
  kind: IsmsContextIssueKind;
  description: string;
  effect: string;
  source: IsmsContextSource;
  derivedFrom: string | null;
  position: number;
}

/** Summary row returned by `ensure-setup`. */
export interface IsmsSetupDocument {
  id: string;
  type: IsmsDocumentType;
  status: IsmsDocumentStatus;
  requirementId: string | null;
  hasApprovedVersion: boolean;
}

export interface IsmsEnsureSetupResponse {
  success: boolean;
  documents: IsmsSetupDocument[];
}

/** Full document returned by `GET /v1/isms/documents/:id`. */
export interface IsmsDocument {
  id: string;
  type: IsmsDocumentType;
  status: IsmsDocumentStatus;
  title: string;
  approverId: string | null;
  approvedAt: string | null;
  declinedAt: string | null;
  contextIssues: IsmsContextIssue[];
}

export interface IsmsDriftResult {
  isStale: boolean;
  changedSources: string[];
}

/** Display metadata for each foundational-document card, keyed by type. */
export interface IsmsTypeMeta {
  type: IsmsDocumentType;
  clause: string;
  title: string;
  description: string;
  /** Only Context of the Organization (4.1) links to a working detail page. */
  detailRouteEnabled: boolean;
}

export const ISMS_TYPE_META: IsmsTypeMeta[] = [
  {
    type: 'context_of_organization',
    clause: '4.1',
    title: 'Context of the Organization',
    description:
      'Internal and external issues relevant to the ISMS and their effect on its objectives.',
    detailRouteEnabled: true,
  },
  {
    type: 'interested_parties_register',
    clause: '4.2',
    title: 'Interested Parties Register',
    description: 'The interested parties relevant to the information security management system.',
    detailRouteEnabled: false,
  },
  {
    type: 'interested_parties_requirements',
    clause: '4.2',
    title: 'Interested Parties Requirements',
    description: 'Requirements of interested parties relevant to information security.',
    detailRouteEnabled: false,
  },
  {
    type: 'isms_scope',
    clause: '4.3',
    title: 'ISMS Scope',
    description: 'The boundaries and applicability of the information security management system.',
    detailRouteEnabled: false,
  },
  {
    type: 'leadership_commitment',
    clause: '5.1',
    title: 'Leadership and Commitment',
    description: 'Evidence of top-management leadership and commitment to the ISMS.',
    detailRouteEnabled: false,
  },
  {
    type: 'objectives_plan',
    clause: '6.2',
    title: 'Information Security Objectives and Plan',
    description: 'Information security objectives and the plans to achieve them.',
    detailRouteEnabled: false,
  },
];

/** Map a URL slug (e.g. "context-of-organization") to the canonical type. */
export const ISMS_SLUG_TO_TYPE: Record<string, IsmsDocumentType> = {
  'context-of-organization': 'context_of_organization',
  'interested-parties-register': 'interested_parties_register',
  'interested-parties-requirements': 'interested_parties_requirements',
  'isms-scope': 'isms_scope',
  'leadership-commitment': 'leadership_commitment',
  'objectives-plan': 'objectives_plan',
};

export function ismsTypeToSlug(type: IsmsDocumentType): string {
  const entry = Object.entries(ISMS_SLUG_TO_TYPE).find(([, value]) => value === type);
  return entry ? entry[0] : type.replace(/_/g, '-');
}

export const ISO27001_NAMES = ['ISO 27001', 'iso27001', 'ISO27001'];
