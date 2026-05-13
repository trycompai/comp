import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { logCloudSecurityActivity } from './cloud-security-audit';
import { normalizeCheckId } from './check-definition.utils';

/** Minimum chars for an exception reason — meant to discourage low-effort
 * reasons like "ok" or "test". Auditors rely on this field as the
 * documentation for why the finding isn't being fixed. */
export const MIN_EXCEPTION_REASON_LENGTH = 20;

export interface MarkExceptionInput {
  findingId: string;
  organizationId: string;
  userId: string;
  reason: string;
  reviewedBy?: string | null;
  expiresAt?: Date | null;
}

@Injectable()
export class CloudExceptionService {
  private readonly logger = new Logger(CloudExceptionService.name);

  /**
   * Mark a finding as an exception. Idempotent per (orgId, connectionId,
   * checkId, resourceId) — re-marking the same finding while an active
   * exception exists is treated as an update of the existing exception.
   */
  async markAsException(input: MarkExceptionInput): Promise<{ id: string }> {
    if (input.reason.trim().length < MIN_EXCEPTION_REASON_LENGTH) {
      throw new BadRequestException(
        `Exception reason must be at least ${MIN_EXCEPTION_REASON_LENGTH} characters.`,
      );
    }
    if (input.expiresAt && input.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'Exception expiration date must be in the future.',
      );
    }

    const lookup = await this.resolveFindingForException(
      input.findingId,
      input.organizationId,
    );

    // Atomic upsert against the (orgId, connectionId, checkId, resourceId)
    // unique constraint — guarantees a single row per finding even under
    // concurrent mark-as-exception requests. The unique constraint allows
    // re-marking after a revoke to clear `revokedAt` on the same row; the
    // full mark/revoke history still lives in AuditLog.
    const upserted = await db.findingException.upsert({
      where: {
        organizationId_connectionId_checkId_resourceId: {
          organizationId: input.organizationId,
          connectionId: lookup.connectionId,
          checkId: lookup.checkId,
          resourceId: lookup.resourceId,
        },
      },
      create: {
        organizationId: input.organizationId,
        connectionId: lookup.connectionId,
        checkId: lookup.checkId,
        resourceId: lookup.resourceId,
        reason: input.reason.trim(),
        reviewedBy: input.reviewedBy ?? null,
        expiresAt: input.expiresAt ?? null,
        markedById: input.userId,
      },
      update: {
        reason: input.reason.trim(),
        reviewedBy: input.reviewedBy ?? null,
        expiresAt: input.expiresAt ?? null,
        // Clear revocation when re-marking — same row, refreshed metadata.
        revokedAt: null,
        revokedById: null,
        markedById: input.userId,
        markedAt: new Date(),
      },
    });
    const exceptionId = upserted.id;

    await logCloudSecurityActivity({
      organizationId: input.organizationId,
      userId: input.userId,
      connectionId: lookup.connectionId,
      action: 'exception_marked',
      description: `Marked finding ${lookup.checkId}:${lookup.resourceId} as exception — ${input.reason.slice(0, 80)}${input.reason.length > 80 ? '…' : ''}`,
      metadata: {
        findingId: input.findingId,
        exceptionId,
        checkId: lookup.checkId,
        resourceId: lookup.resourceId,
        expiresAt: input.expiresAt?.toISOString() ?? null,
      },
    });

    return { id: exceptionId };
  }

  async revokeException(params: {
    exceptionId: string;
    organizationId: string;
    userId: string;
  }): Promise<void> {
    const existing = await db.findingException.findFirst({
      where: { id: params.exceptionId, organizationId: params.organizationId },
    });
    if (!existing) throw new NotFoundException('Exception not found');
    if (existing.revokedAt) {
      throw new BadRequestException('Exception is already revoked.');
    }

    await db.findingException.update({
      where: { id: params.exceptionId },
      data: { revokedAt: new Date(), revokedById: params.userId },
    });

    await logCloudSecurityActivity({
      organizationId: params.organizationId,
      userId: params.userId,
      connectionId: existing.connectionId,
      action: 'exception_revoked',
      description: `Revoked exception on ${existing.checkId}:${existing.resourceId}.`,
      metadata: {
        exceptionId: params.exceptionId,
        checkId: existing.checkId,
        resourceId: existing.resourceId,
      },
    });
  }

  /**
   * Active = exists for this (org, connection, check, resource), not
   * revoked, and (no expiration OR expiration in the future).
   * Used by getFindings to filter and by reconciliation to detect
   * `exception_marked` resolutions.
   */
  async isExceptionActive(params: {
    organizationId: string;
    connectionId: string;
    checkId: string;
    resourceId: string;
  }): Promise<boolean> {
    const exception = await db.findingException.findFirst({
      where: {
        organizationId: params.organizationId,
        connectionId: params.connectionId,
        checkId: params.checkId,
        resourceId: params.resourceId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });
    return Boolean(exception);
  }

  /**
   * Resolve a finding ID into the (connectionId, checkId, resourceId)
   * tuple that exception storage is keyed by. Forbids cross-tenant access.
   */
  private async resolveFindingForException(
    findingId: string,
    organizationId: string,
  ): Promise<{ connectionId: string; checkId: string; resourceId: string }> {
    const result = await db.integrationCheckResult.findFirst({
      where: {
        id: findingId,
        checkRun: { connection: { organizationId } },
      },
      select: {
        resourceId: true,
        evidence: true,
        checkRun: { select: { connectionId: true } },
      },
    });

    if (!result) {
      throw new ForbiddenException(
        'Finding not found, or it does not belong to your organization.',
      );
    }

    const evidence = result.evidence as Record<string, unknown> | null;
    const rawFindingKey =
      evidence && typeof evidence.findingKey === 'string'
        ? evidence.findingKey
        : null;
    if (!rawFindingKey || !result.resourceId) {
      throw new BadRequestException(
        'This finding cannot be marked as an exception — it lacks a stable check/resource identity.',
      );
    }

    return {
      connectionId: result.checkRun.connectionId,
      checkId: normalizeCheckId(rawFindingKey, result.resourceId),
      resourceId: result.resourceId,
    };
  }
}
