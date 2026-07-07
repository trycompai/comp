import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type { IsmsDocumentType, Prisma } from '@db';
import { buildExportSections } from '../documents/registry';
import { loadOrgProfile } from '../documents/org-profile';
import type { DocumentExportInput, IsmsOrgProfile } from '../documents/types';
import { buildExportMetadata } from './export-metadata';
import {
  generateIsmsExportFile,
  type IsmsExportFormat,
  type IsmsExportResult,
} from './export-generator';
import type { IsmsExportMetadata } from './export-shared';

/**
 * The immutable content snapshot stored on a published IsmsDocumentVersion.
 * Everything needed to re-render a historical version byte-faithfully if its
 * stored file is ever missing: the document type, the export input (register
 * rows + narrative + org profile) and the export metadata frozen at publish.
 */
export interface IsmsExportSnapshot {
  type: IsmsDocumentType;
  input: DocumentExportInput;
  metadata: IsmsExportMetadata;
}

/** Prisma include for a document being exported or snapshotted. */
export const EXPORT_DOCUMENT_INCLUDE = {
  framework: { select: { name: true } },
  organization: { select: { name: true, website: true, primaryColor: true } },
  approver: { select: { user: { select: { name: true, email: true } } } },
  currentVersion: { select: { version: true } },
  contextIssues: { orderBy: { position: 'asc' } },
  interestedParties: { orderBy: { position: 'asc' } },
  interestedPartyRequirements: { orderBy: { position: 'asc' } },
  objectives: { orderBy: { position: 'asc' } },
} satisfies Prisma.IsmsDocumentInclude;

export type LoadedExportDocument = Prisma.IsmsDocumentGetPayload<{
  include: typeof EXPORT_DOCUMENT_INCLUDE;
}>;

/** Load a document with everything the export/snapshot builders need. */
export async function loadExportDocument(
  documentId: string,
  organizationId: string,
): Promise<LoadedExportDocument | null> {
  return db.ismsDocument.findFirst({
    where: { id: documentId, organizationId },
    include: EXPORT_DOCUMENT_INCLUDE,
  });
}

/** The Context document (4.1) renders an org overview; other types don't need it. */
export async function resolveOrgProfile(
  document: LoadedExportDocument,
  client?: Prisma.TransactionClient,
): Promise<IsmsOrgProfile | undefined> {
  if (document.type !== 'context_of_organization') return undefined;
  return loadOrgProfile({
    organizationId: document.organizationId,
    frameworkId: document.frameworkId,
    client,
  });
}

/** Map the loaded document's live rows + draft narrative into export input. */
export function buildExportInput({
  document,
  orgProfile,
}: {
  document: LoadedExportDocument;
  orgProfile?: IsmsOrgProfile;
}): DocumentExportInput {
  return {
    contextIssues: document.contextIssues.map((issue) => ({
      kind: issue.kind,
      category: issue.category,
      description: issue.description,
      effect: issue.effect,
    })),
    interestedParties: document.interestedParties.map((party) => ({
      name: party.name,
      category: party.category,
      needsExpectations: party.needsExpectations,
    })),
    requirements: document.interestedPartyRequirements.map((row) => ({
      partyName: row.partyName,
      requirement: row.requirement,
      treatment: row.treatment,
    })),
    objectives: document.objectives.map((objective) => ({
      objective: objective.objective,
      target: objective.target,
      cadence: objective.cadence,
      status: objective.status,
      plan: objective.plan,
      measurementMethod: objective.measurementMethod,
    })),
    narrative: document.draftNarrative ?? null,
    orgProfile,
  };
}

/**
 * The version number to show for the current draft: the published version when
 * the draft is clean (approved), the next number when edits are in progress, or
 * 1 before anything has been published.
 */
export function draftVersionNumber(document: LoadedExportDocument): number {
  const published = document.currentVersion?.version ?? 0;
  if (!document.currentVersion) return 1;
  return document.status === 'approved' ? published : published + 1;
}

/** Build the full export snapshot ({type,input,metadata}) for the current draft. */
export async function buildDraftSnapshot(
  document: LoadedExportDocument,
): Promise<IsmsExportSnapshot> {
  const orgProfile = await resolveOrgProfile(document);
  const input = buildExportInput({ document, orgProfile });
  const metadata = buildExportMetadata({
    type: document.type,
    title: document.title,
    frameworkName: document.framework.name || 'ISO 27001',
    version: draftVersionNumber(document),
    status: document.status,
    preparedBy: document.preparedBy,
    owner: null,
    approverName:
      document.approver?.user?.name || document.approver?.user?.email || null,
    approvedAt: document.approvedAt,
    declinedAt: document.declinedAt,
    organizationName: document.organization.name,
    primaryColor: document.organization.primaryColor,
  });
  return { type: document.type, input, metadata };
}

/** Render a document's current DRAFT to a file (used by the export endpoint). */
export async function renderLiveExport({
  documentId,
  organizationId,
  format,
}: {
  documentId: string;
  organizationId: string;
  format: IsmsExportFormat;
}): Promise<IsmsExportResult> {
  const document = await loadExportDocument(documentId, organizationId);
  if (!document) {
    throw new NotFoundException('ISMS document not found');
  }
  return renderSnapshot(await buildDraftSnapshot(document), format);
}

/** Render a stored/derived export snapshot to a file. */
export function renderSnapshot(
  snapshot: IsmsExportSnapshot,
  format: IsmsExportFormat,
): Promise<IsmsExportResult> {
  const sections = buildExportSections({
    type: snapshot.type,
    input: snapshot.input,
  });
  return generateIsmsExportFile({
    sections,
    metadata: snapshot.metadata,
    format,
  });
}

/** Parse a stored contentSnapshot JSON back into an export snapshot, or null. */
export function parseExportSnapshot(
  value: Prisma.JsonValue | null | undefined,
): IsmsExportSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!record.type || !record.input || !record.metadata) return null;
  return record as unknown as IsmsExportSnapshot;
}
