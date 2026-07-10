import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@db';
import { invalidateApprovalIfNeeded } from './utils/approval';
import { lockDocument } from './utils/document-lock';
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

    // Idempotent add: the (roleId, memberId) unique constraint means a repeat add
    // from the picker returns the existing assignment rather than 500-ing.
    const existing = await db.ismsRoleAssignment.findFirst({
      where: { roleId: dto.roleId, memberId: dto.memberId },
    });
    if (existing) return existing;

    return db.$transaction(async (tx) => {
      await lockDocument(tx, documentId);
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
          remediationDueDate: this.toDate(dto.remediationDueDate) ?? null,
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
          remediationDueDate: this.toDate(dto.remediationDueDate),
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
      await invalidateApprovalIfNeeded({
        tx,
        documentId: assignment.documentId,
      });
      await tx.ismsRoleAssignment.delete({ where: { id: assignmentId } });
    });
    return { success: true };
  }

  /** undefined → leave as-is; null/empty → clear; string → parsed Date. */
  private toDate(value: string | null | undefined): Date | null | undefined {
    if (value === undefined) return undefined;
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    return date;
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
      where: { id: documentId, organizationId },
    });
    if (!document) {
      throw new NotFoundException('ISMS document not found');
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
    const member = await db.member.findFirst({
      where: { id: memberId, organizationId },
    });
    if (!member) {
      throw new NotFoundException('Member not found in organization');
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
