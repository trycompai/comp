import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { ExportIsmsDocumentDto } from './dto/export-isms-document.dto';
import { collectPlatformData } from './documents/data-source';
import { runDerivation } from './documents/generate';
import { buildExportSections } from './documents/registry';
import {
  diffPlatformSnapshots,
  parsePlatformSnapshot,
} from './documents/snapshot';
import type { DocumentExportInput } from './documents/types';
import {
  generateIsmsExportFile,
  type IsmsExportResult,
} from './utils/export-generator';
import { upsertLatestSnapshotVersion } from './utils/version-snapshot';

const DOCUMENT_INCLUDE = {
  versions: { where: { isLatest: true }, take: 1 },
  contextIssues: { orderBy: { position: 'asc' } },
  interestedParties: { orderBy: { position: 'asc' } },
  interestedPartyRequirements: { orderBy: { position: 'asc' } },
  objectives: { orderBy: { position: 'asc' } },
} as const;

/**
 * ISMS document derivation, drift detection and export. Dispatches by document
 * type to the per-document handlers under ./documents. Document lifecycle
 * (approve/decline/submit) lives in IsmsService; register CRUD in the register
 * services.
 */
@Injectable()
export class IsmsContextService {
  async generate({
    documentId,
    organizationId,
  }: {
    documentId: string;
    organizationId: string;
  }) {
    const document = await db.ismsDocument.findFirst({
      where: { id: documentId, organizationId },
    });
    if (!document) {
      throw new NotFoundException('ISMS document not found');
    }

    const data = await collectPlatformData({
      organizationId,
      frameworkId: document.frameworkId,
    });

    await db.$transaction(async (tx) => {
      await runDerivation({
        tx,
        type: document.type,
        documentId,
        organizationId,
        frameworkId: document.frameworkId,
        data,
      });
      await upsertLatestSnapshotVersion({ tx, documentId, snapshot: data });
    });

    return this.loadDocument({ documentId, organizationId });
  }

  async drift({
    documentId,
    organizationId,
  }: {
    documentId: string;
    organizationId: string;
  }): Promise<{ isStale: boolean; changedSources: string[] }> {
    const document = await db.ismsDocument.findFirst({
      where: { id: documentId, organizationId },
      include: { versions: { where: { isLatest: true }, take: 1 } },
    });
    if (!document) {
      throw new NotFoundException('ISMS document not found');
    }

    const current = await collectPlatformData({
      organizationId,
      frameworkId: document.frameworkId,
    });
    const previous = parsePlatformSnapshot(
      document.versions[0]?.sourceSnapshot,
    );

    return diffPlatformSnapshots({ type: document.type, previous, current });
  }

  async exportDocument({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: ExportIsmsDocumentDto;
  }): Promise<IsmsExportResult> {
    const document = await db.ismsDocument.findFirst({
      where: { id: documentId, organizationId },
      include: {
        framework: { select: { name: true } },
        organization: { select: { name: true, primaryColor: true } },
        approver: { select: { user: { select: { name: true, email: true } } } },
        ...DOCUMENT_INCLUDE,
      },
    });
    if (!document) {
      throw new NotFoundException('ISMS document not found');
    }

    const input: DocumentExportInput = {
      contextIssues: document.contextIssues.map((issue) => ({
        kind: issue.kind,
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
      narrative: document.versions[0]?.narrative ?? null,
    };

    const sections = buildExportSections({ type: document.type, input });

    return generateIsmsExportFile({
      sections,
      format: dto.format,
      metadata: {
        title: document.title,
        frameworkName: document.framework.name || 'ISO 27001',
        version: document.versions[0]?.version ?? 1,
        preparedBy: document.preparedBy,
        status: document.status,
        approverName:
          document.approver?.user?.name ||
          document.approver?.user?.email ||
          null,
        approvedAt: document.approvedAt,
        declinedAt: document.declinedAt,
        organizationName: document.organization.name,
        primaryColor: document.organization.primaryColor,
      },
    });
  }

  private async loadDocument({
    documentId,
    organizationId,
  }: {
    documentId: string;
    organizationId: string;
  }) {
    return db.ismsDocument.findFirst({
      where: { id: documentId, organizationId },
      include: DOCUMENT_INCLUDE,
    });
  }
}
