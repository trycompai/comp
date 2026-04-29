import { AttachmentEntityType, BackgroundCheckStatus, db } from '@db';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AttachmentsService } from '../attachments/attachments.service';
import type { UploadAttachmentDto } from '../attachments/upload-attachment.dto';

@Injectable()
export class BackgroundCheckCustomService {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  async getAttachmentsForMember({
    organizationId,
    memberId,
  }: {
    organizationId: string;
    memberId: string;
  }) {
    const record = await db.backgroundCheckRequest.findUnique({
      where: { organizationId_memberId: { organizationId, memberId } },
      select: { id: true },
    });

    if (!record) return [];

    return this.attachmentsService.getAttachmentMetadata(
      organizationId,
      record.id,
      AttachmentEntityType.background_check,
    );
  }

  async attachForMember({
    organizationId,
    memberId,
    employeeName,
    employeeEmail,
    requesterNotes,
    upload,
    userId,
  }: {
    organizationId: string;
    memberId: string;
    employeeName?: string;
    employeeEmail?: string;
    requesterNotes?: string;
    upload: UploadAttachmentDto;
    userId?: string;
  }) {
    const member = await db.member.findFirst({
      where: { id: memberId, organizationId, deactivated: false },
      select: {
        id: true,
        user: { select: { email: true, name: true } },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found.');
    }

    const record = await db.backgroundCheckRequest.upsert({
      where: { organizationId_memberId: { organizationId, memberId } },
      create: {
        organizationId,
        memberId,
        employeeName: employeeName?.trim() || member.user.name || member.user.email,
        employeeEmail: employeeEmail?.trim().toLowerCase() || member.user.email,
        requesterNotes,
        status: BackgroundCheckStatus.completed,
        lastSyncedAt: new Date(),
        reportSyncedAt: new Date(),
      },
      update: {
        employeeName: employeeName?.trim() || member.user.name || member.user.email,
        employeeEmail: employeeEmail?.trim().toLowerCase() || member.user.email,
        requesterNotes,
        status: BackgroundCheckStatus.completed,
        lastSyncedAt: new Date(),
        reportSyncedAt: new Date(),
      },
    });

    await this.attachmentsService.uploadAttachment(
      organizationId,
      record.id,
      AttachmentEntityType.background_check,
      upload,
      userId,
    );

    return record;
  }
}
