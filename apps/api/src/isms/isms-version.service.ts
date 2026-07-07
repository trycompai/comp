import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { AttachmentsService } from '../attachments/attachments.service';
import { buildExportMetadata } from './utils/export-metadata';
import {
  DOCX_MIME_TYPE,
  type IsmsExportFormat,
} from './utils/export-shared';
import {
  sanitizeExportName,
  type IsmsExportResult,
} from './utils/export-generator';
import {
  buildExportInput,
  parseExportSnapshot,
  renderSnapshot,
  resolveOrgProfile,
  type IsmsExportSnapshot,
  type LoadedExportDocument,
} from './utils/export-payload';

/** True when a JSON value is a non-empty plain object (a saved narrative). */
function isNarrativeObject(value: Prisma.JsonValue | null): boolean {
  return (
    value != null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

/**
 * ISMS document version lifecycle (CS-701): freeze the working draft into an
 * immutable published version at approval, list published-version history, and
 * serve a specific version's export (stored file first, snapshot re-render as
 * fallback). Document approval/decline live in IsmsService; live-draft export in
 * IsmsContextService.
 */
@Injectable()
export class IsmsVersionService {
  private readonly logger = new Logger(IsmsVersionService.name);

  constructor(private readonly attachments: AttachmentsService) {}

  /**
   * Freeze the current draft into a new published version row inside `tx`. The
   * caller sets `IsmsDocument.currentVersionId` to the returned id. Rendering +
   * S3 upload happen AFTER the transaction via publishRenders, so a render/upload
   * failure never orphans a DB row (mirrors the Policies publish flow).
   */
  async createPublishedVersion({
    tx,
    document,
    memberId,
    now,
    snapshotData,
    changelog,
  }: {
    tx: Prisma.TransactionClient;
    document: LoadedExportDocument;
    memberId: string;
    now: Date;
    snapshotData: unknown;
    changelog?: string | null;
  }): Promise<{ versionId: string; version: number; snapshot: IsmsExportSnapshot }> {
    const nextVersion = await this.nextVersion(tx, document.id);

    const orgProfile = await resolveOrgProfile(document);
    const input = buildExportInput({ document, orgProfile });
    const metadata = buildExportMetadata({
      type: document.type,
      title: document.title,
      frameworkName: document.framework.name || 'ISO 27001',
      version: nextVersion,
      status: 'approved',
      preparedBy: document.preparedBy,
      owner: null,
      approverName:
        document.approver?.user?.name ||
        document.approver?.user?.email ||
        null,
      approvedAt: now,
      declinedAt: null,
      organizationName: document.organization.name,
      primaryColor: document.organization.primaryColor,
    });
    const snapshot: IsmsExportSnapshot = { type: document.type, input, metadata };

    // Keep the one-latest-per-document invariant (partial unique index).
    await tx.ismsDocumentVersion.updateMany({
      where: { documentId: document.id, isLatest: true },
      data: { isLatest: false },
    });

    const narrative: Prisma.InputJsonValue = isNarrativeObject(
      document.draftNarrative,
    )
      ? JSON.parse(JSON.stringify(document.draftNarrative))
      : {};

    const created = await tx.ismsDocumentVersion.create({
      data: {
        documentId: document.id,
        version: nextVersion,
        isLatest: true,
        narrative,
        contentSnapshot: JSON.parse(JSON.stringify(snapshot)),
        sourceSnapshot: JSON.parse(JSON.stringify(snapshotData)),
        publishedById: memberId,
        publishedAt: now,
        changelog: changelog ?? null,
      },
      select: { id: true },
    });

    return { versionId: created.id, version: nextVersion, snapshot };
  }

  /**
   * Render both formats and upload them to S3, then store the keys on the version.
   * Best-effort: a failure is logged, not thrown — historical export falls back to
   * re-rendering from the version's contentSnapshot.
   */
  async publishRenders({
    organizationId,
    documentId,
    versionId,
    version,
    snapshot,
  }: {
    organizationId: string;
    documentId: string;
    versionId: string;
    version: number;
    snapshot: IsmsExportSnapshot;
  }): Promise<void> {
    try {
      const [pdf, docx] = await Promise.all([
        renderSnapshot(snapshot, 'pdf'),
        renderSnapshot(snapshot, 'docx'),
      ]);
      const base = `${organizationId}/isms/${documentId}/v${version}-${Date.now()}`;
      const pdfKey = `${base}.pdf`;
      const docxKey = `${base}.docx`;
      await Promise.all([
        this.attachments.uploadBuffer(pdfKey, pdf.fileBuffer, pdf.mimeType),
        this.attachments.uploadBuffer(docxKey, docx.fileBuffer, docx.mimeType),
      ]);
      await db.ismsDocumentVersion.update({
        where: { id: versionId },
        data: { pdfUrl: pdfKey, docxUrl: docxKey },
      });
    } catch (err) {
      this.logger.error(
        `ISMS version ${versionId} render/upload failed; export will fall back to on-demand render`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /** List a document's published versions (history), newest first. */
  async getVersions({
    documentId,
    organizationId,
  }: {
    documentId: string;
    organizationId: string;
  }) {
    const document = await db.ismsDocument.findFirst({
      where: { id: documentId, organizationId },
      select: { currentVersionId: true },
    });
    if (!document) {
      throw new NotFoundException('ISMS document not found');
    }

    const versions = await db.ismsDocumentVersion.findMany({
      where: { documentId, publishedAt: { not: null } },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        publishedAt: true,
        changelog: true,
        pdfUrl: true,
        docxUrl: true,
        // The frozen snapshot backs both the approver-name fallback (survives an
        // approver being deleted) and download availability (a version is still
        // downloadable via snapshot re-render even if its stored file is absent).
        contentSnapshot: true,
        publishedBy: { select: { user: { select: { name: true, email: true } } } },
      },
    });

    return {
      currentVersionId: document.currentVersionId,
      versions: versions.map((v) => {
        const snapshot = parseExportSnapshot(v.contentSnapshot);
        const hasSnapshot = snapshot != null;
        return {
          id: v.id,
          version: v.version,
          publishedAt: v.publishedAt,
          changelog: v.changelog,
          // Live member first; fall back to the approver name frozen at publish so
          // history keeps an approver even if the member is later removed.
          publishedByName:
            v.publishedBy?.user?.name ||
            v.publishedBy?.user?.email ||
            snapshot?.metadata?.approverName ||
            null,
          hasPdf: v.pdfUrl != null || hasSnapshot,
          hasDocx: v.docxUrl != null || hasSnapshot,
          isCurrent: v.id === document.currentVersionId,
        };
      }),
    };
  }

  /**
   * Export a specific published version: serve its stored file (byte-identical to
   * what was approved), else re-render from its snapshot, else — for a legacy
   * migrated version with neither — render from current live data.
   */
  async getVersionExport({
    documentId,
    organizationId,
    versionId,
    format,
  }: {
    documentId: string;
    organizationId: string;
    versionId: string;
    format: IsmsExportFormat;
  }): Promise<IsmsExportResult> {
    const version = await db.ismsDocumentVersion.findFirst({
      where: { id: versionId, documentId, document: { organizationId } },
      select: {
        version: true,
        pdfUrl: true,
        docxUrl: true,
        contentSnapshot: true,
        document: { select: { title: true } },
      },
    });
    if (!version) {
      throw new NotFoundException('ISMS document version not found');
    }

    const mimeType = format === 'pdf' ? 'application/pdf' : DOCX_MIME_TYPE;
    const filename = `${sanitizeExportName(version.document.title)}-v${version.version}.${format}`;

    // Prefer the byte-identical stored artifact. If its S3 object is missing or
    // temporarily unavailable, fall through to the immutable snapshot rather than
    // failing the download.
    const key = format === 'pdf' ? version.pdfUrl : version.docxUrl;
    if (key) {
      try {
        const fileBuffer = await this.attachments.getObjectBuffer(key);
        return { fileBuffer, mimeType, filename };
      } catch (err) {
        this.logger.warn(
          `Stored export ${key} unavailable for ISMS version ${versionId}; re-rendering from snapshot`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    const snapshot = parseExportSnapshot(version.contentSnapshot);
    if (snapshot) return renderSnapshot(snapshot, format);

    // Neither a stored file nor a snapshot exists (only possible for a legacy /
    // migrated version). Never serve current live data for a specific historical
    // version — an auditor must get exactly what was approved, or a clear failure.
    throw new NotFoundException(
      'No retained export exists for this document version',
    );
  }

  private async nextVersion(
    tx: Prisma.TransactionClient,
    documentId: string,
  ): Promise<number> {
    const last = await tx.ismsDocumentVersion.findFirst({
      where: { documentId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return (last?.version ?? 0) + 1;
  }
}
