import { Injectable } from '@nestjs/common';
import { db } from '@db';
import archiver from 'archiver';
import { AttachmentsService } from '../attachments/attachments.service';
import { AccessRevocationService } from './access-revocation.service';
import { OffboardingChecklistService } from './offboarding-checklist.service';

type ChecklistItems = Awaited<
  ReturnType<OffboardingChecklistService['getMemberChecklist']>
>['items'];

type VendorList = Awaited<
  ReturnType<AccessRevocationService['getAccessRevocations']>
>['vendors'];

@Injectable()
export class OffboardingExportService {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly accessRevocationService: AccessRevocationService,
    private readonly offboardingChecklistService: OffboardingChecklistService,
  ) {}

  async exportMemberEvidence({
    organizationId,
    memberId,
    output,
  }: {
    organizationId: string;
    memberId: string;
    output: NodeJS.WritableStream;
  }) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(output);

    const checklist =
      await this.offboardingChecklistService.getMemberChecklist(
        organizationId,
        memberId,
      );
    const revocations =
      await this.accessRevocationService.getAccessRevocations(
        organizationId,
        memberId,
      );

    this.appendSummaryCsv(archive, checklist.items);
    this.appendVendorRevocationsCsv(archive, revocations.vendors);
    await this.appendVendorEvidence(
      archive,
      organizationId,
      revocations.vendors,
    );
    await this.appendChecklistEvidence(
      archive,
      organizationId,
      checklist.items,
    );

    await archive.finalize();
  }

  private appendSummaryCsv(
    archive: archiver.Archiver,
    items: ChecklistItems,
    prefix = '',
  ) {
    const rows = [
      'Item,Status,Completed By,Completed Date,Evidence Count',
      ...items.map((item) => {
        const status = item.completed ? 'Complete' : 'Pending';
        const completedBy = item.completion?.completedBy?.name ?? '';
        const completedDate = item.completion?.completedAt
          ? new Date(item.completion.completedAt).toISOString().split('T')[0]
          : '';
        return `"${escapeCsvField(item.title)}",${status},"${escapeCsvField(completedBy)}",${completedDate},${item.evidence.length}`;
      }),
    ];
    archive.append(rows.join('\n'), { name: `${prefix}summary.csv` });
  }

  private appendVendorRevocationsCsv(
    archive: archiver.Archiver,
    vendors: VendorList,
    prefix = '',
  ) {
    const rows = [
      'Vendor,Confirmed By,Date,Has Evidence',
      ...vendors.map((v) => {
        const confirmedBy = v.revokedBy?.name ?? '';
        const date = v.revokedAt
          ? new Date(v.revokedAt).toISOString().split('T')[0]
          : '';
        const hasEvidence = (v.evidence?.length ?? 0) > 0 ? 'Yes' : 'No';
        return `"${escapeCsvField(v.vendorName)}","${escapeCsvField(confirmedBy)}",${date},${hasEvidence}`;
      }),
    ];
    archive.append(rows.join('\n'), {
      name: `${prefix}vendor-access-revocations/vendor-access-revocations.csv`,
    });
  }

  private async appendVendorEvidence(
    archive: archiver.Archiver,
    organizationId: string,
    vendors: VendorList,
    prefix = '',
  ) {
    for (const vendor of vendors) {
      if (!vendor.evidence || vendor.evidence.length === 0) continue;
      for (const file of vendor.evidence) {
        const buffer = await this.getAttachmentBuffer(organizationId, file.id);
        if (!buffer) continue;
        const safeName = sanitizeFileName(file.name);
        archive.append(buffer, {
          name: `${prefix}vendor-access-revocations/evidence/${file.id}-${safeName}`,
        });
      }
    }
  }

  private async appendChecklistEvidence(
    archive: archiver.Archiver,
    organizationId: string,
    items: ChecklistItems,
    prefix = '',
  ) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.evidence.length === 0) continue;
      const folderNum = String(i + 1).padStart(2, '0');
      const folderName = item.title
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
      for (const file of item.evidence) {
        const buffer = await this.getAttachmentBuffer(organizationId, file.id);
        if (!buffer) continue;
        const safeName = sanitizeFileName(file.name);
        archive.append(buffer, {
          name: `${prefix}checklist-items/${folderNum}-${folderName}/${safeName}`,
        });
      }
    }
  }

  async exportAllOffboardings({
    organizationId,
    output,
  }: {
    organizationId: string;
    output: NodeJS.WritableStream;
  }) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(output);

    const BATCH_SIZE = 50;
    let cursor: string | undefined;

    while (true) {
      const batch = await db.member.findMany({
        where: { organizationId, offboardDate: { not: null }, deactivated: true },
        include: { user: { select: { name: true, email: true } } },
        orderBy: [{ offboardDate: 'desc' }, { id: 'asc' }],
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      for (const member of batch) {
        const safeName = (member.user.name ?? 'member')
          .replace(/[^a-zA-Z0-9 ]/g, '')
          .replace(/\s+/g, '-')
          .toLowerCase();
        const prefix = `offboarded-employees/${safeName}-${member.id}/`;

        const checklist = await this.offboardingChecklistService.getMemberChecklist(
          organizationId,
          member.id,
        );
        const revocations = await this.accessRevocationService.getAccessRevocations(
          organizationId,
          member.id,
        );

        this.appendSummaryCsv(archive, checklist.items, prefix);
        this.appendVendorRevocationsCsv(archive, revocations.vendors, prefix);
        await this.appendVendorEvidence(archive, organizationId, revocations.vendors, prefix);
        await this.appendChecklistEvidence(archive, organizationId, checklist.items, prefix);
      }

      if (batch.length < BATCH_SIZE) break;
      cursor = batch[batch.length - 1]!.id;
    }

    await archive.finalize();
  }

  private async getAttachmentBuffer(
    organizationId: string,
    attachmentId: string,
  ): Promise<Buffer | null> {
    try {
      const attachment = await db.attachment.findFirst({
        where: { id: attachmentId, organizationId },
      });
      if (!attachment) return null;
      return await this.attachmentsService.getObjectBuffer(attachment.url);
    } catch {
      return null;
    }
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/.*[/\\]/, '').replace(/[/\\]/g, '_') || 'file';
}

function escapeCsvField(value: string): string {
  const escaped = value.replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(escaped)) {
    return `'${escaped}`;
  }
  return escaped;
}
