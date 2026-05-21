import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AttachmentEntityType, db } from '@db';
import { AttachmentsService } from '../attachments/attachments.service';

@Injectable()
export class AccessRevocationService {
  private readonly logger = new Logger(AccessRevocationService.name);

  constructor(private readonly attachmentsService: AttachmentsService) {}
  async getAccessRevocations(organizationId: string, memberId: string) {
    const vendors = await db.vendor.findMany({
      where: { organizationId },
      select: { id: true, name: true, website: true, logoUrl: true },
      orderBy: { name: 'asc' },
    });

    const revocations = await db.offboardingAccessRevocation.findMany({
      where: { organizationId, memberId },
      include: {
        revokedBy: { select: { id: true, name: true, email: true } },
      },
    });

    const revocationMap = new Map(
      revocations.map((r) => [r.vendorId, r]),
    );

    const vendorList = await Promise.all(
      vendors.map(async (vendor) => {
        const revocation = revocationMap.get(vendor.id);
        const domain = vendor.website?.replace(/^https?:\/\//, '').replace(/\/.*$/, '') ?? null;
        const evidence = revocation
          ? await this.attachmentsService.getAttachments(
              organizationId,
              revocation.id,
              AttachmentEntityType.offboarding_checklist,
            )
          : [];
        return {
          vendorId: vendor.id,
          vendorName: vendor.name,
          logoUrl: vendor.logoUrl ?? (domain ? `https://img.logo.dev/${domain}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ&size=64` : null),
          revoked: !!revocation,
          revokedAt: revocation?.revokedAt ?? null,
          revokedBy: revocation?.revokedBy ?? null,
          notes: revocation?.notes ?? null,
          evidence,
        };
      }),
    );

    return {
      vendors: vendorList,
      totalVendors: vendors.length,
      revokedCount: revocations.length,
    };
  }

  async revokeVendorAccess({
    organizationId,
    memberId,
    vendorId,
    revokedById,
    notes,
    evidence,
  }: {
    organizationId: string;
    memberId: string;
    vendorId: string;
    revokedById: string;
    notes?: string;
    evidence?: { fileName: string; fileType: string; fileData: string };
  }) {
    const member = await db.member.findFirst({
      where: { id: memberId, organizationId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    const vendor = await db.vendor.findFirst({
      where: { id: vendorId, organizationId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found in this organization');
    }

    const existing = await db.offboardingAccessRevocation.findUnique({
      where: { memberId_vendorId: { memberId, vendorId } },
    });

    if (existing) {
      throw new BadRequestException(
        'Vendor access has already been revoked for this member',
      );
    }

    const revocation = await db.offboardingAccessRevocation.create({
      data: {
        organizationId,
        memberId,
        vendorId,
        revokedById,
        notes,
      },
      include: {
        revokedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (evidence) {
      try {
        await this.attachmentsService.uploadAttachment(
          organizationId,
          revocation.id,
          AttachmentEntityType.offboarding_checklist,
          evidence,
          revokedById,
        );
      } catch (err) {
        await db.offboardingAccessRevocation.delete({ where: { id: revocation.id } });
        throw err;
      }
    }

    try {
      await this.syncAccessRevocationCompletion(
        organizationId,
        memberId,
        revokedById,
      );
    } catch (err) {
      this.logger.warn(`Failed to sync access revocation completion for member ${memberId}`, err);
    }

    return revocation;
  }

  async undoVendorRevocation({
    organizationId,
    memberId,
    vendorId,
  }: {
    organizationId: string;
    memberId: string;
    vendorId: string;
  }) {
    const revocation = await db.offboardingAccessRevocation.findFirst({
      where: { memberId, vendorId, organizationId },
    });

    if (!revocation) {
      throw new NotFoundException('Revocation record not found');
    }

    const attachments = await this.attachmentsService.getAttachments(
      organizationId,
      revocation.id,
      AttachmentEntityType.offboarding_checklist,
    );

    for (const attachment of attachments) {
      await this.attachmentsService.deleteAttachment(organizationId, attachment.id);
    }

    await db.offboardingAccessRevocation.delete({
      where: { id: revocation.id },
    });

    try {
      await this.syncAccessRevocationCompletion(organizationId, memberId);
    } catch (err) {
      this.logger.warn(`Failed to sync access revocation completion for member ${memberId}`, err);
    }

    return { success: true };
  }

  async revokeAllVendorAccess({
    organizationId,
    memberId,
    revokedById,
  }: {
    organizationId: string;
    memberId: string;
    revokedById: string;
  }) {
    const member = await db.member.findFirst({
      where: { id: memberId, organizationId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    const vendors = await db.vendor.findMany({
      where: { organizationId },
      select: { id: true },
    });

    const existing = await db.offboardingAccessRevocation.findMany({
      where: { organizationId, memberId },
      select: { vendorId: true },
    });

    const existingSet = new Set(existing.map((r) => r.vendorId));
    const toCreate = vendors.filter((v) => !existingSet.has(v.id));

    if (toCreate.length > 0) {
      await db.offboardingAccessRevocation.createMany({
        data: toCreate.map((v) => ({
          organizationId,
          memberId,
          vendorId: v.id,
          revokedById,
        })),
        skipDuplicates: true,
      });
    }

    try {
      await this.syncAccessRevocationCompletion(organizationId, memberId, revokedById);
    } catch (err) {
      this.logger.warn(`Failed to sync access revocation completion for member ${memberId}`, err);
    }

    return { confirmed: toCreate.length };
  }

  private async syncAccessRevocationCompletion(
    organizationId: string,
    memberId: string,
    completedById?: string,
  ) {
    const templateItem = await db.offboardingChecklistTemplate.findFirst({
      where: { organizationId, isAccessRevocation: true, isEnabled: true },
    });

    if (!templateItem) {
      return;
    }

    const [totalVendors, revokedCount] = await Promise.all([
      db.vendor.count({ where: { organizationId } }),
      db.offboardingAccessRevocation.count({ where: { organizationId, memberId } }),
    ]);

    const allRevoked = totalVendors > 0 && revokedCount === totalVendors;

    const existingCompletion =
      await db.offboardingChecklistCompletion.findFirst({
        where: { organizationId, memberId, templateItemId: templateItem.id },
      });

    if (allRevoked && !existingCompletion && completedById) {
      await db.offboardingChecklistCompletion.create({
        data: {
          organizationId,
          memberId,
          templateItemId: templateItem.id,
          completedById,
        },
      });
    }

    if (!allRevoked && existingCompletion) {
      await db.offboardingChecklistCompletion.delete({
        where: { id: existingCompletion.id },
      });
    }
  }
}
