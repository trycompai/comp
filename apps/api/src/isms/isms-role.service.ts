import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { invalidateApprovalIfNeeded } from './utils/approval';
import { lockDocument } from './utils/document-lock';
import { parseOptionalDate } from './utils/parse-optional-date';
import type {
  CreateRoleInput,
  UpdateRoleInput,
} from './registers/register-registry';

/**
 * CRUD for the ISMS Governance Roles register (clause 5.3). The four seeded roles
 * are created idempotently by seedRolesIfMissing; this service handles custom-role
 * creation, edits to any role's text, and the Internal Auditor route selection.
 * Editing a row flips its source to 'manual' (records the override); seeded roles
 * cannot be removed.
 */
@Injectable()
export class IsmsRoleService {
  async create({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: CreateRoleInput;
  }) {
    await this.requireDocument({ documentId, organizationId });

    return db.$transaction(async (tx) => {
      await lockDocument(tx, documentId);
      const position =
        dto.position ?? (await this.nextPosition({ tx, documentId }));
      await invalidateApprovalIfNeeded({ tx, documentId });
      return tx.ismsRole.create({
        data: {
          documentId,
          roleKey: null, // customer-added custom role
          name: dto.name,
          description: dto.description ?? '',
          responsibilities: dto.responsibilities ?? '',
          authorities: dto.authorities ?? '',
          authorityGrantedBy: dto.authorityGrantedBy ?? 'Top Management',
          requiredCompetence: dto.requiredCompetence ?? '',
          source: 'manual',
          position,
        },
      });
    });
  }

  async update({
    roleId,
    organizationId,
    dto,
  }: {
    roleId: string;
    organizationId: string;
    dto: UpdateRoleInput;
  }) {
    const role = await this.requireRole({ roleId, organizationId });
    const auditRouteMemberId = await this.resolveMember({
      memberId: dto.auditRouteMemberId,
      organizationId,
    });

    return db.$transaction(async (tx) => {
      // Same per-document lock submit/approve take, so an edit can't race the
      // submission's completeness check.
      await lockDocument(tx, role.documentId);
      await invalidateApprovalIfNeeded({ tx, documentId: role.documentId });
      return tx.ismsRole.update({
        where: { id: roleId },
        data: {
          name: dto.name ?? undefined,
          description: dto.description ?? undefined,
          responsibilities: dto.responsibilities ?? undefined,
          authorities: dto.authorities ?? undefined,
          authorityGrantedBy: dto.authorityGrantedBy ?? undefined,
          requiredCompetence: dto.requiredCompetence ?? undefined,
          auditRoute: dto.auditRoute === undefined ? undefined : dto.auditRoute,
          auditRouteMemberId:
            dto.auditRouteMemberId === undefined ? undefined : auditRouteMemberId,
          auditFirmName:
            dto.auditFirmName === undefined ? undefined : dto.auditFirmName,
          auditEvidenceRef:
            dto.auditEvidenceRef === undefined
              ? undefined
              : dto.auditEvidenceRef,
          auditCourse:
            dto.auditCourse === undefined ? undefined : dto.auditCourse,
          auditDueDate: parseOptionalDate(dto.auditDueDate),
          position: dto.position ?? undefined,
          source: 'manual',
        },
      });
    });
  }

  async remove({
    roleId,
    organizationId,
  }: {
    roleId: string;
    organizationId: string;
  }) {
    const role = await this.requireRole({ roleId, organizationId });
    if (role.roleKey) {
      throw new BadRequestException(
        'Seeded governance roles cannot be removed; edit their text instead.',
      );
    }
    await db.$transaction(async (tx) => {
      await lockDocument(tx, role.documentId);
      await invalidateApprovalIfNeeded({ tx, documentId: role.documentId });
      await tx.ismsRole.delete({ where: { id: roleId } });
    });
    return { success: true };
  }

  private async resolveMember({
    memberId,
    organizationId,
  }: {
    memberId: string | null | undefined;
    organizationId: string;
  }): Promise<string | null | undefined> {
    if (memberId === undefined) return undefined;
    const trimmed = memberId?.trim();
    if (!trimmed) return null;
    // Role holders (incl. the audit-route member) must be active People members.
    const member = await db.member.findFirst({
      where: { id: trimmed, organizationId, deactivated: false },
    });
    if (!member) {
      throw new NotFoundException('Active member not found in organization');
    }
    return trimmed;
  }

  private async nextPosition({
    tx,
    documentId,
  }: {
    tx: Prisma.TransactionClient;
    documentId: string;
  }) {
    const last = await tx.ismsRole.findFirst({
      where: { documentId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return (last?.position ?? -1) + 1;
  }

  private async requireDocument({
    documentId,
    organizationId,
  }: {
    documentId: string;
    organizationId: string;
  }) {
    // Scope to the Roles document type: role rows must never attach to another
    // ISMS document (they'd be invisible to the Clause 5.3 export).
    const document = await db.ismsDocument.findFirst({
      where: {
        id: documentId,
        organizationId,
        type: 'roles_and_responsibilities',
      },
    });
    if (!document) {
      throw new NotFoundException('ISMS roles document not found');
    }
    return document;
  }

  private async requireRole({
    roleId,
    organizationId,
  }: {
    roleId: string;
    organizationId: string;
  }) {
    const role = await db.ismsRole.findFirst({
      where: { id: roleId, document: { organizationId } },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }
}
