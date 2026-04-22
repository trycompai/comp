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

    const stripeResult = await this.runExternalStep(
      'stripe',
      organizationId,
      () => this.externalService.cleanupStripe(snapshot.stripe),
    );
    const vectorResult = await this.runExternalStep(
      'vector-store',
      organizationId,
      () => this.externalService.cleanupVectorStore(snapshot),
    );
    const s3Result = await this.runExternalStep('s3', organizationId, () =>
      this.externalService.cleanupS3(organizationId, snapshot),
    );

    await db.organization.delete({ where: { id: organizationId } });

    await this.verifyDeletion(organizationId);

    const externalCleanup: PurgeExternalCleanupResult = {
      stripe: stripeResult,
      s3: s3Result,
      vectorStore: vectorResult,
    };

    await this.writeAdminAuditLog({
      loggingOrgId,
      adminUserId,
      snapshot,
      status: 'completed',
      externalCleanup,
    });

    return {
      success: true,
      organizationId,
      deletedCounts: snapshot.counts,
      externalCleanup,
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

  private async verifyDeletion(organizationId: string): Promise<void> {
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
    const leftovers = results.filter(([, count]) => count > 0);
    if (leftovers.length > 0) {
      const summary = leftovers
        .map(([name, count]) => `${name}=${count}`)
        .join(', ');
      throw new Error(
        `Organization ${organizationId} purge verification failed — leftover rows: ${summary}`,
      );
    }

    const s3Clean = await this.externalService.verifyS3Clean(organizationId);
    if (!s3Clean) {
      throw new Error(
        `Organization ${organizationId} purge verification failed — S3 objects remain under prefix`,
      );
    }
  }

  private async writeAdminAuditLog(params: {
    loggingOrgId: string;
    adminUserId: string;
    snapshot: PurgeSnapshot;
    status: 'initiated' | 'completed';
    externalCleanup?: PurgeExternalCleanupResult;
  }): Promise<void> {
    const description =
      params.status === 'initiated'
        ? `Initiated purge of organization '${params.snapshot.organization.name}'`
        : `Completed purge of organization '${params.snapshot.organization.name}'`;

    const data: Record<string, unknown> = {
      action: description,
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

  private async findAdminMembershipOrgId(
    adminUserId: string,
    excludeOrgId: string,
  ): Promise<string | null> {
    const member = await db.member.findFirst({
      where: {
        userId: adminUserId,
        organizationId: { not: excludeOrgId },
        deactivated: false,
      },
      select: { organizationId: true },
      orderBy: { createdAt: 'asc' },
    });
    return member?.organizationId ?? null;
  }
}
