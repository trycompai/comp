import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { ExportIsmsDocumentDto } from './dto/export-isms-document.dto';
import { collectPlatformData } from './documents/data-source';
import { runDerivation } from './documents/generate';
import {
  diffPlatformSnapshots,
  parsePlatformSnapshot,
} from './documents/snapshot';
import type { IsmsPlatformData } from './documents/types';
import { updateDraftSnapshot } from './utils/draft-snapshot';
import { renderLiveExport } from './utils/export-payload';
import type { IsmsExportResult } from './utils/export-generator';
import { IsmsVersionService } from './isms-version.service';

const DOCUMENT_INCLUDE = {
  currentVersion: { select: { id: true, version: true, publishedAt: true } },
  contextIssues: { orderBy: { position: 'asc' } },
  interestedParties: { orderBy: { position: 'asc' } },
  interestedPartyRequirements: { orderBy: { position: 'asc' } },
  objectives: { orderBy: { position: 'asc' } },
  controlLinks: {
    select: {
      id: true,
      controlId: true,
      control: { select: { id: true, name: true } },
    },
  },
} as const;

/**
 * ISMS document derivation, drift detection and export. Dispatches by document
 * type to the per-document handlers under ./documents. Document lifecycle
 * (approve/decline/submit) lives in IsmsService, version history + per-version
 * export in IsmsVersionService, and register CRUD in the register services.
 */
@Injectable()
export class IsmsContextService {
  constructor(private readonly versionService: IsmsVersionService) {}

  async generate({
    documentId,
    organizationId,
    data: precollected,
  }: {
    documentId: string;
    organizationId: string;
    /**
     * Pre-collected platform data, reused instead of re-querying. Passed by
     * generateAll so the expensive multi-query collect runs once for the whole
     * batch instead of once per document. Omit for a standalone regenerate.
     */
    data?: IsmsPlatformData;
  }) {
    const document = await db.ismsDocument.findFirst({
      where: { id: documentId, organizationId },
    });
    if (!document) {
      throw new NotFoundException('ISMS document not found');
    }

    const data =
      precollected ??
      (await collectPlatformData({
        organizationId,
        frameworkId: document.frameworkId,
      }));

    await db.$transaction(async (tx) => {
      await runDerivation({
        tx,
        type: document.type,
        documentId,
        organizationId,
        frameworkId: document.frameworkId,
        data,
      });
      await updateDraftSnapshot({ tx, documentId, snapshot: data });
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
      select: { type: true, frameworkId: true, draftSnapshot: true },
    });
    if (!document) {
      throw new NotFoundException('ISMS document not found');
    }

    const current = await collectPlatformData({
      organizationId,
      frameworkId: document.frameworkId,
    });
    const previous = parsePlatformSnapshot(document.draftSnapshot);

    return diffPlatformSnapshots({ type: document.type, previous, current });
  }

  /**
   * Export a document. With `versionId`, serve that published version (stored file
   * or snapshot re-render); without, render the current working draft on demand.
   */
  async exportDocument({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: ExportIsmsDocumentDto;
  }): Promise<IsmsExportResult> {
    if (dto.versionId) {
      return this.versionService.getVersionExport({
        documentId,
        organizationId,
        versionId: dto.versionId,
        format: dto.format,
      });
    }
    return renderLiveExport({ documentId, organizationId, format: dto.format });
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
