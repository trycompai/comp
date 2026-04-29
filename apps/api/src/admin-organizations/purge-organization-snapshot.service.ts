import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { extractS3KeyFromUrl } from '../app/s3';
import type {
  PurgeS3BucketRef,
  PurgeS3KeysByBucket,
  PurgeSnapshot,
} from './purge-organization.types';

@Injectable()
export class PurgeOrganizationSnapshotService {
  private readonly logger = new Logger(PurgeOrganizationSnapshotService.name);

  async build(organizationId: string): Promise<PurgeSnapshot> {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true, logo: true },
    });

    if (!org) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    const [
      trustResources,
      trustNdas,
      trustDocs,
      orgChart,
      questionnaires,
      kbDocs,
      scriptVersions,
      attachments,
      manualAnswers,
      integrations,
      counts,
    ] = await Promise.all([
      // The legacy `organization_billing` and `pentest_subscriptions`
      // tables were dropped in migration 20260427000000_pentest_credits;
      // they were Stripe-coupled records that never had production data
      // and have been superseded by the `pentest_credits` wallet model.
      // The snapshot intentionally omits them — there's nothing to
      // capture. If/when v2 introduces real Stripe billing, the new
      // tables get added here at that point.
      db.trustResource.findMany({
        where: { organizationId },
        select: { s3Key: true },
      }),
      db.trustNDAAgreement.findMany({
        where: { organizationId },
        select: { pdfTemplateKey: true, pdfSignedKey: true },
      }),
      db.trustDocument.findMany({
        where: { organizationId },
        select: { s3Key: true },
      }),
      db.organizationChart.findUnique({
        where: { organizationId },
        select: { uploadedImageUrl: true },
      }),
      db.questionnaire.findMany({
        where: { organizationId },
        select: { s3Key: true },
      }),
      db.knowledgeBaseDocument.findMany({
        where: { organizationId },
        select: { id: true, s3Key: true },
      }),
      db.evidenceAutomationVersion.findMany({
        where: { evidenceAutomation: { task: { organizationId } } },
        select: { scriptKey: true },
      }),
      db.attachment.findMany({
        where: { organizationId },
        select: { url: true },
      }),
      db.securityQuestionnaireManualAnswer.findMany({
        where: { organizationId },
        select: { id: true },
      }),
      db.integrationConnection.findMany({
        where: { organizationId },
        select: { id: true, providerId: true },
      }),
      this.countOrgRows(organizationId),
    ]);

    const keysByBucket: Record<PurgeS3BucketRef, Set<string>> = {
      orgAssets: new Set(),
      default: new Set(),
      knowledgeBase: new Set(),
      questionnaire: new Set(),
    };
    const add = (bucket: PurgeS3BucketRef, key: string | null | undefined) => {
      if (key) keysByBucket[bucket].add(key);
    };

    add('orgAssets', org.logo);
    for (const r of trustResources) add('orgAssets', r.s3Key);
    for (const d of trustDocs) add('orgAssets', d.s3Key);
    for (const n of trustNdas) {
      add('default', n.pdfTemplateKey);
      add('default', n.pdfSignedKey);
    }
    add('default', orgChart?.uploadedImageUrl ?? null);
    for (const v of scriptVersions) add('default', v.scriptKey);
    for (const q of questionnaires) add('questionnaire', q.s3Key);
    for (const k of kbDocs) add('knowledgeBase', k.s3Key);
    for (const a of attachments) {
      if (!a.url) continue;
      try {
        add('default', extractS3KeyFromUrl(a.url));
      } catch (err) {
        this.logger.warn(
          `Skipping attachment with unparseable URL during purge of ${organizationId}`,
          err instanceof Error ? err.message : 'unknown',
        );
      }
    }

    const s3KeysByBucket: PurgeS3KeysByBucket = {};
    for (const [bucket, set] of Object.entries(keysByBucket) as Array<
      [PurgeS3BucketRef, Set<string>]
    >) {
      if (set.size > 0) s3KeysByBucket[bucket] = [...set];
    }

    return {
      organization: { id: org.id, name: org.name, slug: org.slug },
      counts,
      // Stripe IDs intentionally null — the source tables were dropped
      // in 20260427000000_pentest_credits. The shape is preserved so
      // downstream consumers (purge orchestrator) don't need to change
      // until v2 billing replaces these.
      stripe: {
        customerId: null,
        subscriptionId: null,
      },
      s3KeysByBucket,
      knowledgeBaseDocumentIds: kbDocs.map((d) => d.id),
      manualAnswerIds: manualAnswers.map((m) => m.id),
      integrations: integrations.map((i) => ({
        id: i.id,
        provider: i.providerId,
      })),
    };
  }

  private async countOrgRows(
    organizationId: string,
  ): Promise<Record<string, number>> {
    const where = { organizationId };
    const [
      members,
      apiKeys,
      auditLogs,
      controls,
      policies,
      tasks,
      vendors,
      risks,
      findings,
      evidenceSubmissions,
      devices,
      integrations,
      knowledgeBaseDocs,
      questionnaires,
      frameworkInstances,
      trustResources,
      attachments,
      secrets,
    ] = await Promise.all([
      db.member.count({ where }),
      db.apiKey.count({ where }),
      db.auditLog.count({ where }),
      db.control.count({ where }),
      db.policy.count({ where }),
      db.task.count({ where }),
      db.vendor.count({ where }),
      db.risk.count({ where }),
      db.finding.count({ where }),
      db.evidenceSubmission.count({ where }),
      db.device.count({ where }),
      db.integrationConnection.count({ where }),
      db.knowledgeBaseDocument.count({ where }),
      db.questionnaire.count({ where }),
      db.frameworkInstance.count({ where }),
      db.trustResource.count({ where }),
      db.attachment.count({ where }),
      db.secret.count({ where }),
    ]);

    return {
      members,
      apiKeys,
      auditLogs,
      controls,
      policies,
      tasks,
      vendors,
      risks,
      findings,
      evidenceSubmissions,
      devices,
      integrations,
      knowledgeBaseDocs,
      questionnaires,
      frameworkInstances,
      trustResources,
      attachments,
      secrets,
    };
  }
}
