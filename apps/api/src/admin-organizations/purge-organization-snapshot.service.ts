import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { extractS3KeyFromUrl } from '../app/s3';
import type { PurgeSnapshot } from './purge-organization.types';

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
      billing,
      pentest,
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
      db.organizationBilling.findUnique({
        where: { organizationId },
        select: { stripeCustomerId: true },
      }),
      db.pentestSubscription.findUnique({
        where: { organizationId },
        select: { stripeSubscriptionId: true },
      }),
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

    const s3KeysFromSchema: string[] = [];

    if (org.logo) s3KeysFromSchema.push(org.logo);
    for (const r of trustResources) if (r.s3Key) s3KeysFromSchema.push(r.s3Key);
    for (const n of trustNdas) {
      if (n.pdfTemplateKey) s3KeysFromSchema.push(n.pdfTemplateKey);
      if (n.pdfSignedKey) s3KeysFromSchema.push(n.pdfSignedKey);
    }
    for (const d of trustDocs) if (d.s3Key) s3KeysFromSchema.push(d.s3Key);
    if (orgChart?.uploadedImageUrl) {
      s3KeysFromSchema.push(orgChart.uploadedImageUrl);
    }
    for (const q of questionnaires) if (q.s3Key) s3KeysFromSchema.push(q.s3Key);
    for (const k of kbDocs) if (k.s3Key) s3KeysFromSchema.push(k.s3Key);
    for (const v of scriptVersions) {
      if (v.scriptKey) s3KeysFromSchema.push(v.scriptKey);
    }
    for (const a of attachments) {
      if (!a.url) continue;
      try {
        s3KeysFromSchema.push(extractS3KeyFromUrl(a.url));
      } catch (err) {
        this.logger.warn(
          `Skipping attachment with unparseable URL during purge of ${organizationId}`,
          err instanceof Error ? err.message : 'unknown',
        );
      }
    }

    return {
      organization: { id: org.id, name: org.name, slug: org.slug },
      counts,
      stripe: {
        customerId: billing?.stripeCustomerId ?? null,
        subscriptionId: pentest?.stripeSubscriptionId ?? null,
      },
      s3KeysFromSchema: [...new Set(s3KeysFromSchema)],
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
