import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { invalidateApprovalIfNeeded } from './utils/approval';
import { lockDocument } from './utils/document-lock';
import { parseOptionalDate } from './utils/parse-optional-date';
import type {
  CreateRoleAssignmentInput,
  UpdateRoleAssignmentInput,
} from './registers/register-registry';

/**
 * CRUD for role member assignments + their competence evidence (clauses 5.3/7.2).
 * Each row is one member assigned to one role. Creating is idempotent per
 * (role, member) so re-adding a member in the picker never duplicates. Assignment
 * changes revert an approved document to draft, like every other register edit.
 */
@Injectable()
export class IsmsRoleAssignmentService {
  async create({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: CreateRoleAssignmentInput;
  }) {
    await this.requireDocument({ documentId, organizationId });
    await this.requireRoleInDocument({ roleId: dto.roleId, documentId });
    await this.requireMember({ memberId: dto.memberId, organizationId });

    return db.$transaction(async (tx) => {
      await lockDocument(tx, documentId);
      // Idempotency inside the per-document lock: concurrent duplicate adds for
      // the same (role, member) serialize here, so the second caller returns the
      // first's row instead of hitting the (roleId, memberId) unique index.
      const existing = await tx.ismsRoleAssignment.findFirst({
        where: { roleId: dto.roleId, memberId: dto.memberId },
      });
      if (existing) return existing;

      const position =
        dto.position ?? (await this.nextPosition({ tx, roleId: dto.roleId }));
      await invalidateApprovalIfNeeded({ tx, documentId });
      return tx.ismsRoleAssignment.create({
        data: {
          roleId: dto.roleId,
          documentId,
          memberId: dto.memberId,
          basisOfCompetence: dto.basisOfCompetence ?? null,
          evidenceRetained: dto.evidenceRetained ?? null,
          gap: dto.gap ?? null,
          remediationAction: dto.remediationAction ?? null,
          remediationDueDate: parseOptionalDate(dto.remediationDueDate) ?? null,
          position,
        },
      });
    });
  }

  async update({
    assignmentId,
    organizationId,
    dto,
  }: {
    assignmentId: string;
    organizationId: string;
    dto: UpdateRoleAssignmentInput;
  }) {
    const assignment = await this.requireAssignment({
      assignmentId,
      organizationId,
    });

    return db.$transaction(async (tx) => {
      await lockDocument(tx, assignment.documentId);
      await invalidateApprovalIfNeeded({
        tx,
        documentId: assignment.documentId,
      });
      return tx.ismsRoleAssignment.update({
        where: { id: assignmentId },
        data: {
          basisOfCompetence:
            dto.basisOfCompetence === undefined
              ? undefined
              : dto.basisOfCompetence,
          evidenceRetained:
            dto.evidenceRetained === undefined
              ? undefined
              : dto.evidenceRetained,
          gap: dto.gap === undefined ? undefined : dto.gap,
          remediationAction:
            dto.remediationAction === undefined
              ? undefined
              : dto.remediationAction,
          remediationDueDate: parseOptionalDate(dto.remediationDueDate),
          position: dto.position ?? undefined,
        },
      });
    });
  }

  async remove({
    assignmentId,
    organizationId,
  }: {
    assignmentId: string;
    organizationId: string;
  }) {
    const assignment = await this.requireAssignment({
      assignmentId,
      organizationId,
    });
    await db.$transaction(async (tx) => {
      await lockDocument(tx, assignment.documentId);
      await invalidateApprovalIfNeeded({
        tx,
        documentId: assignment.documentId,
      });
      await tx.ismsRoleAssignment.delete({ where: { id: assignmentId } });
    });
    return { success: true };
  }

  private async nextPosition({
    tx,
    roleId,
  }: {
    tx: Prisma.TransactionClient;
    roleId: string;
  }) {
    const last = await tx.ismsRoleAssignment.findFirst({
      where: { roleId },
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

  private async requireRoleInDocument({
    roleId,
    documentId,
  }: {
    roleId: string;
    documentId: string;
  }) {
    const role = await db.ismsRole.findFirst({
      where: { id: roleId, documentId },
    });
    if (!role) {
      throw new NotFoundException('Role not found in document');
    }
    return role;
  }

  private async requireMember({
    memberId,
    organizationId,
  }: {
    memberId: string;
    organizationId: string;
  }) {
    // Assignments must reference active People members (CS-698).
    const member = await db.member.findFirst({
      where: { id: memberId, organizationId, deactivated: false },
    });
    if (!member) {
      throw new NotFoundException('Active member not found in organization');
    }
    return member;
  }

  private async requireAssignment({
    assignmentId,
    organizationId,
  }: {
    assignmentId: string;
    organizationId: string;
  }) {
    const assignment = await db.ismsRoleAssignment.findFirst({
      where: { id: assignmentId, role: { document: { organizationId } } },
    });
    if (!assignment) {
      throw new NotFoundException('Role assignment not found');
    }
    return assignment;
  }
}
