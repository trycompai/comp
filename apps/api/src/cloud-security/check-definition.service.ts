import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import { AiDescriptionService, DESCRIPTION_MODEL_VERSION } from './ai-description.service';
import type { CheckDescription } from './ai-description.prompt';
import { buildProviderPassthroughDescription } from './check-definition-provider-passthrough';
import { computeSourceHash, normalizeCheckId } from './check-definition.utils';

export { normalizeCheckId };

/**
 * The CheckDescription returned to clients. `source` lets the UI render a
 * subtle hint about whether the content was AI-generated (AWS) or
 * surfaced directly from the cloud provider's own catalog (GCP / Azure).
 */
export interface ResolvedCheckDescription extends CheckDescription {
  source: 'ai' | 'provider';
}

export interface CheckDescriptionRequest {
  organizationId: string;
  /** Normalized, resource-agnostic check identifier — see normalizeCheckId. */
  checkId: string;
  provider: 'aws' | 'gcp' | 'azure' | string;
  serviceName: string | null;
  /** Per-finding title / description / remediation — the SOURCE we hash. */
  title: string;
  description: string | null;
  severity: string | null;
  remediation: string | null;
  /** Raw evidence — used for GCP/Azure passthrough only. */
  evidence: Record<string, unknown> | null;
}


@Injectable()
export class CheckDefinitionService {
  private readonly logger = new Logger(CheckDefinitionService.name);

  constructor(private readonly aiDescription: AiDescriptionService) {}

  /**
   * Resolve a check description for a finding by its ID. Scoped to the
   * caller's organization to prevent cross-tenant leaks. Returns null
   * when the finding doesn't exist or no useful description can be
   * produced (UI degrades gracefully).
   */
  async getForFinding(
    findingId: string,
    organizationId: string,
  ): Promise<ResolvedCheckDescription | null> {
    const request = await this.resolveFindingToRequest(
      findingId,
      organizationId,
    );
    if (!request) return null;
    return this.getOrCreate(request);
  }

  private async resolveFindingToRequest(
    findingId: string,
    organizationId: string,
  ): Promise<CheckDescriptionRequest | null> {
    // Try new-platform first (IntegrationCheckResult — id prefix `icx_`).
    const newResult = await db.integrationCheckResult.findFirst({
      where: {
        id: findingId,
        checkRun: { connection: { organizationId } },
      },
      select: {
        title: true,
        description: true,
        severity: true,
        remediation: true,
        resourceId: true,
        evidence: true,
        checkRun: {
          select: {
            checkId: true,
            connection: { select: { provider: { select: { slug: true } } } },
          },
        },
      },
    });

    if (newResult) {
      const evidence =
        newResult.evidence && typeof newResult.evidence === 'object'
          ? (newResult.evidence as Record<string, unknown>)
          : null;
      const findingKey =
        evidence && typeof evidence.findingKey === 'string'
          ? evidence.findingKey
          : newResult.checkRun.checkId;
      const serviceName =
        evidence && typeof evidence.serviceName === 'string'
          ? evidence.serviceName
          : evidence && typeof evidence.service === 'string'
            ? evidence.service
            : null;
      return {
        organizationId,
        checkId: normalizeCheckId(findingKey, newResult.resourceId),
        provider: newResult.checkRun.connection.provider.slug,
        serviceName,
        title: newResult.title ?? '',
        description: newResult.description,
        severity: newResult.severity,
        remediation: newResult.remediation,
        evidence,
      };
    }

    // Fall back to legacy IntegrationResult (id prefix `itr_`).
    const legacy = await db.integrationResult.findFirst({
      where: { id: findingId, organizationId },
      select: {
        title: true,
        description: true,
        severity: true,
        remediation: true,
        resultDetails: true,
        integration: { select: { integrationId: true } },
      },
    });

    if (!legacy) return null;

    const details =
      legacy.resultDetails && typeof legacy.resultDetails === 'object'
        ? (legacy.resultDetails as Record<string, unknown>)
        : null;
    return {
      organizationId,
      // Legacy results have no granular checkKey — use title as the cache key
      // (low-fidelity but stable across instances).
      checkId: legacy.title ?? findingId,
      provider: legacy.integration.integrationId,
      serviceName: null,
      title: legacy.title ?? '',
      description: legacy.description,
      severity: legacy.severity,
      remediation: legacy.remediation,
      evidence: details,
    };
  }

  /**
   * Resolve a check description for a finding.
   *
   * - AWS: cached per (orgId, checkId) with source-hash invalidation.
   *   First-view triggers a Haiku call (~1-2s); all subsequent views and
   *   all other findings of the same check type hit the cache (~50ms).
   * - GCP / Azure: derived synchronously from provider evidence — no AI,
   *   no DB cache. Returns null when evidence doesn't carry enough context.
   */
  async getOrCreate(
    req: CheckDescriptionRequest,
  ): Promise<ResolvedCheckDescription | null> {
    if (req.provider === 'gcp' || req.provider === 'azure') {
      return buildProviderPassthroughDescription({
        provider: req.provider,
        title: req.title,
        description: req.description,
        evidence: req.evidence,
      });
    }
    return this.fromCacheOrGenerate(req);
  }

  private async fromCacheOrGenerate(
    req: CheckDescriptionRequest,
  ): Promise<ResolvedCheckDescription | null> {
    const sourceHash = computeSourceHash(req);

    const cached = await db.checkDefinition.findUnique({
      where: {
        organizationId_checkId: {
          organizationId: req.organizationId,
          checkId: req.checkId,
        },
      },
    });

    if (cached && cached.sourceHash === sourceHash) {
      return {
        title: cached.title,
        description: cached.description,
        passCriteria: cached.passCriteria,
        failCriteria: cached.failCriteria,
        whyItMatters: cached.whyItMatters,
        source: 'ai',
      };
    }

    const generated = await this.aiDescription.generate({
      provider: req.provider,
      serviceName: req.serviceName,
      title: req.title,
      description: req.description,
      severity: req.severity,
      remediation: req.remediation,
    });

    if (!generated) return null;

    try {
      await db.checkDefinition.upsert({
        where: {
          organizationId_checkId: {
            organizationId: req.organizationId,
            checkId: req.checkId,
          },
        },
        create: {
          organizationId: req.organizationId,
          checkId: req.checkId,
          sourceHash,
          modelVersion: DESCRIPTION_MODEL_VERSION,
          ...generated,
        },
        update: {
          sourceHash,
          modelVersion: DESCRIPTION_MODEL_VERSION,
          generatedAt: new Date(),
          ...generated,
        },
      });
    } catch (err) {
      // Persist failure shouldn't break the read path — log and serve the
      // freshly-generated content anyway.
      this.logger.warn(
        `CheckDefinition cache write failed for ${req.checkId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return { ...generated, source: 'ai' };
  }

}
