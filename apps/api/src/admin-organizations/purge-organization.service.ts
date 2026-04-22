import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditLogEntityType, db, Prisma } from '@db';
import { PurgeOrganizationSnapshotService } from './purge-organization-snapshot.service';
import { PurgeOrganizationExternalService } from './purge-organization-external.service';
import type {
  PurgeExternalCleanupResult,
  PurgeResult,
  PurgeSnapshot,
  PurgeVerificationResult,
} from './purge-organization.types';

@Injectable()
export class PurgeOrganizationService {
  private readonly logger = new Logger(PurgeOrganizationService.name);

  constructor(
    private readonly snapshotService: PurgeOrganizationSnapshotService,
    private readonly externalService: PurgeOrganizationExternalService,
  ) {}

  async purgeOrganization(params: {
    organizationId: string;
    confirm: string;
    adminUserId: string;
  }): Promise<PurgeResult> {
    const { organizationId, confirm, adminUserId } = params;

    const snapshot = await this.snapshotService.build(organizationId);

    if (confirm !== snapshot.organization.slug) {
      throw new BadRequestException(
        `Confirmation does not match organization slug. Expected '${snapshot.organization.slug}'.`,
      );
    }

    // Fail closed if we cannot write a durable audit trail. The target org's
    // audit log will be cascade-deleted, so we require the acting admin to
    // have another active membership to hold the record.
    const loggingOrgId = await this.findAdminMembershipOrgId(
      adminUserId,
      organizationId,
    );
    if (!loggingOrgId) {
      throw new UnprocessableEntityException(
        'Cannot purge organization: platform admin has no other active ' +
          'organization membership to record the audit trail against. Add the ' +
          'admin as a member of another organization before retrying.',
      );
    }

    await this.writeAdminAuditLog({
      loggingOrgId,
      adminUserId,
      snapshot,
      status: 'initiated',
    });

    let stripeResult: PurgeExternalCleanupResult['stripe'];
    let vectorResult: PurgeExternalCleanupResult['vectorStore'];
    let s3Result: PurgeExternalCleanupResult['s3'];
    try {
      stripeResult = await this.runExternalStep('stripe', organizationId, () =>
        this.externalService.cleanupStripe(snapshot.stripe),
      );
      vectorResult = await this.runExternalStep(
        'vector-store',
        organizationId,
        () => this.externalService.cleanupVectorStore(snapshot),
      );
      s3Result = await this.runExternalStep('s3', organizationId, () =>
        this.externalService.cleanupS3(organizationId, snapshot),
      );

      // Verify S3 is clean *before* deleting the DB row. After the DB delete
      // we can no longer fail safely — the org is gone regardless.
      const s3Clean = await this.externalService.verifyS3Clean(
        organizationId,
        snapshot,
      );
      if (!s3Clean) {
        throw new Error(
          `Organization ${organizationId} purge verification failed — S3 objects remain`,
        );
      }

      await db.organization.delete({ where: { id: organizationId } });
    } catch (err) {
      // Pair the "initiated" record with a "failed" record so the audit trail
      // is not left open-ended. Best-effort: we do not want a secondary write
      // failure to mask the underlying purge error.
      try {
        await this.writeAdminAuditLog({
          loggingOrgId,
          adminUserId,
          snapshot,
          status: 'failed',
          failureReason: err instanceof Error ? err.message : String(err),
        });
      } catch (logErr) {
        this.logger.error(
          `Failed to write failure audit log for purge of ${organizationId}`,
          logErr instanceof Error ? logErr.stack : logErr,
        );
      }
      throw err;
    }

    const externalCleanup: PurgeExternalCleanupResult = {
      stripe: stripeResult,
      s3: s3Result,
      vectorStore: vectorResult,
    };

    // Post-delete verification of cascade completeness. We do not throw on
    // leftovers here because the org is already gone — throwing would lie
    // to the caller about deletion state. Surface it in the response and
    // log loudly so operators can investigate.
    const verification = await this.verifyDeletion(organizationId);
    if (!verification.verified) {
      this.logger.error(
        `Organization ${organizationId} deleted but cascade left rows: ` +
          Object.entries(verification.leftoverRows)
            .map(([k, v]) => `${k}=${v}`)
            .join(', '),
      );
    }

    // Completion audit is best-effort: the purge has already succeeded, so
    // failing the request here would lie to the caller about deletion state.
    // The "initiated" record written earlier is the durable trail.
    try {
      await this.writeAdminAuditLog({
        loggingOrgId,
        adminUserId,
        snapshot,
        status: 'completed',
        externalCleanup,
        verification,
      });
    } catch (err) {
      this.logger.error(
        `Failed to write completion audit log for purge of ${organizationId}; ` +
          `deletion succeeded, initiated audit record is the record of truth`,
        err instanceof Error ? err.stack : err,
      );
    }

    return {
      success: true,
      organizationId,
      deletedCounts: snapshot.counts,
      externalCleanup,
      verification,
    };
  }

  private async runExternalStep<T>(
    step: string,
    organizationId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      this.logger.error(
        `Purge external step '${step}' failed for org ${organizationId}`,
        err instanceof Error ? err.stack : err,
      );
      throw new InternalServerErrorException(
        `External cleanup step '${step}' failed. See server logs.`,
      );
    }
  }

  private async verifyDeletion(
    organizationId: string,
  ): Promise<PurgeVerificationResult> {
    const where = { organizationId };
    const checks: Array<[string, Promise<number>]> = [
      ['apiKey', db.apiKey.count({ where })],
      ['member', db.member.count({ where })],
      ['control', db.control.count({ where })],
      ['policy', db.policy.count({ where })],
      ['task', db.task.count({ where })],
      ['auditLog', db.auditLog.count({ where })],
      ['device', db.device.count({ where })],
      ['integrationConnection', db.integrationConnection.count({ where })],
      ['vendor', db.vendor.count({ where })],
      ['risk', db.risk.count({ where })],
    ];

    const results = await Promise.all(
      checks.map(async ([name, p]) => [name, await p] as const),
    );
    const leftoverRows: Record<string, number> = {};
    for (const [name, count] of results) {
      if (count > 0) leftoverRows[name] = count;
    }

    // S3 was already verified pre-delete, but we've kept the field for
    // compatibility with a potential future async verification pass.
    const s3Clean = true;

    return {
      verified: Object.keys(leftoverRows).length === 0 && s3Clean,
      leftoverRows,
      s3Clean,
    };
  }

  private async writeAdminAuditLog(params: {
    loggingOrgId: string;
    adminUserId: string;
    snapshot: PurgeSnapshot;
    status: 'initiated' | 'completed' | 'failed';
    externalCleanup?: PurgeExternalCleanupResult;
    failureReason?: string;
    verification?: PurgeVerificationResult;
  }): Promise<void> {
    const descriptions: Record<typeof params.status, string> = {
      initiated: `Initiated purge of organization '${params.snapshot.organization.name}'`,
      completed: `Completed purge of organization '${params.snapshot.organization.name}'`,
      failed: `Failed purge of organization '${params.snapshot.organization.name}'`,
    };
    const description = descriptions[params.status];

    const data: Record<string, unknown> = {
      action: description,
      status: params.status,
      resource: 'admin',
      permission: 'platform-admin',
      targetOrganization: params.snapshot.organization,
      counts: params.snapshot.counts,
      stripe: params.snapshot.stripe,
      integrations: params.snapshot.integrations,
      s3KeyCountByBucket: Object.fromEntries(
        Object.entries(params.snapshot.s3KeysByBucket).map(([k, v]) => [
          k,
          v.length,
        ]),
      ),
      knowledgeBaseDocumentIds: params.snapshot.knowledgeBaseDocumentIds,
      manualAnswerIdCount: params.snapshot.manualAnswerIds.length,
    };
    if (params.externalCleanup) {
      data.externalCleanup = params.externalCleanup as unknown as Record<
        string,
        unknown
      >;
    }
    if (params.failureReason) {
      data.failureReason = params.failureReason;
    }
    if (params.verification) {
      data.verification = params.verification as unknown as Record<
        string,
        unknown
      >;
    }

    await db.auditLog.create({
      data: {
        organizationId: params.loggingOrgId,
        userId: params.adminUserId,
        memberId: null,
        entityType: AuditLogEntityType.organization,
        entityId: params.snapshot.organization.id,
        description,
        data: data as Prisma.InputJsonValue,
      },
    });
  }

  // Membership must predate this request by at least this much, to prevent an
  // admin from self-inviting into an arbitrary org immediately before a purge
  // to satisfy the audit-trail requirement.
  private static readonly MIN_LOGGING_MEMBERSHIP_AGE_MS = 60 * 60 * 1000;

  private async findAdminMembershipOrgId(
    adminUserId: string,
    excludeOrgId: string,
  ): Promise<string | null> {
    const cutoff = new Date(
      Date.now() - PurgeOrganizationService.MIN_LOGGING_MEMBERSHIP_AGE_MS,
    );
    const member = await db.member.findFirst({
      where: {
        userId: adminUserId,
        organizationId: { not: excludeOrgId },
        deactivated: false,
        createdAt: { lt: cutoff },
      },
      select: { organizationId: true },
      orderBy: { createdAt: 'asc' },
    });
    return member?.organizationId ?? null;
  }
}
