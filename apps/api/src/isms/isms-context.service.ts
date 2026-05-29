import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { ExportIsmsDocumentDto } from './dto/export-isms-document.dto';
import { collectContextData } from './utils/context-data-source';
import {
  deriveContextIssues,
  diffSnapshots,
  type ContextSourceSnapshot,
} from './utils/context-derivation';
import {
  generateIsmsExportFile,
  type IsmsExportIssue,
  type IsmsExportResult,
} from './utils/export-generator';
import { upsertLatestSnapshotVersion } from './utils/version-snapshot';

/**
 * Context-of-the-Organization (clause 4.1) derivation, drift detection and
 * export. Kept separate from IsmsService so each file stays focused; the lifecycle
 * (approve/decline/submit) lives in IsmsService.
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

    if (document.type !== 'context_of_organization') {
      throw new BadRequestException(
        `Generation not yet implemented for type ${document.type}`,
      );
    }

    const snapshot = await collectContextData({
      organizationId,
      frameworkId: document.frameworkId,
    });
    const derived = deriveContextIssues(snapshot);

    await db.$transaction(async (tx) => {
      await tx.ismsContextIssue.deleteMany({
        where: { documentId, source: 'derived' },
      });
      // Manual rows are preserved; derived rows are appended after them.
      const manualCount = await tx.ismsContextIssue.count({
        where: { documentId, source: 'manual' },
      });
      if (derived.length > 0) {
        await tx.ismsContextIssue.createMany({
          data: derived.map((issue, index) => ({
            documentId,
            kind: issue.kind,
            description: issue.description,
            effect: issue.effect,
            source: issue.source,
            derivedFrom: issue.derivedFrom,
            position: manualCount + index,
          })),
        });
      }
      await upsertLatestSnapshotVersion({ tx, documentId, snapshot });
    });

    return this.getDocumentWithIssues({ documentId, organizationId });
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

    const current = await collectContextData({
      organizationId,
      frameworkId: document.frameworkId,
    });
    const previous = parseSnapshot(document.versions[0]?.sourceSnapshot);

    return diffSnapshots({ previous, current });
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
        contextIssues: { orderBy: { position: 'asc' } },
        versions: { where: { isLatest: true }, take: 1 },
      },
    });

    if (!document) {
      throw new NotFoundException('ISMS document not found');
    }

    const issues: IsmsExportIssue[] = document.contextIssues.map((issue) => ({
      kind: issue.kind,
      description: issue.description,
      effect: issue.effect,
    }));

    return generateIsmsExportFile({
      issues,
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

  private async getDocumentWithIssues({
    documentId,
    organizationId,
  }: {
    documentId: string;
    organizationId: string;
  }) {
    return db.ismsDocument.findFirst({
      where: { id: documentId, organizationId },
      include: {
        versions: { where: { isLatest: true }, take: 1 },
        contextIssues: { orderBy: { position: 'asc' } },
      },
    });
  }
}

function parseSnapshot(
  value: Prisma.JsonValue | null | undefined,
): ContextSourceSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    frameworkNames: toStringArray(record.frameworkNames),
    vendorCount: toNumber(record.vendorCount),
    subProcessorCount: toNumber(record.subProcessorCount),
    vendorsByCategory: toNumberRecord(record.vendorsByCategory),
    memberCount: toNumber(record.memberCount),
    membersByDepartment: toNumberRecord(record.membersByDepartment),
    deviceCount: toNumber(record.deviceCount),
  };
}

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function toNumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'number') result[key] = item;
  }
  return result;
}
