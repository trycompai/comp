import { Injectable } from '@nestjs/common';
import type { Prisma } from '@db';
import {
  registry,
  type IntegrationCheck,
  type IntegrationManifest,
  type TaskTemplateId,
} from '@trycompai/integration-platform';
import { CheckRunRepository } from '../repositories/check-run.repository';
import { ConnectionRepository } from '../repositories/connection.repository';

/**
 * One row of an integration check's output, in a stable, FEATURE-AGNOSTIC shape.
 *
 * The envelope (resourceId/passed/etc.) is universal across every check. The
 * check-SPECIFIC payload lives in `evidence` (raw JSON) — this service does NOT
 * interpret it. Each consuming feature validates `evidence` at its own edge
 * (e.g. with a zod schema) and reads only the fields it understands.
 */
export interface CheckResultRow {
  /** Provider-native identifier for the resource (email, bucket ARN, repo, …). */
  resourceId: string;
  /** Kind of resource the check produced (e.g. 'user', 'bucket'). */
  resourceType: string;
  /** Whether this resource passed the check. */
  passed: boolean;
  title: string;
  description: string | null;
  /** Check-specific payload — interpret this in the feature, never here. */
  evidence: Prisma.JsonValue;
  collectedAt: Date;
  runId: string;
  connectionId: string;
}

/** A connected integration that can supply results for a given task. */
export interface CheckSourceInfo {
  slug: string;
  name: string;
  logoUrl: string | null;
  /** The check on this source bound to the requested task. */
  checkId: string;
  connected: boolean;
  connectionId: string | null;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
}

/**
 * Universal, read-only access to integration CHECK RESULTS.
 *
 * The single reuse point for any feature that wants to consume the output of an
 * integration check — 2FA today, background checks / device posture / S3 config
 * tomorrow. It is deliberately feature-agnostic: it fetches results and returns
 * them in a stable envelope, and it does NOT know or care what the data means.
 * Interpretation, domain mapping, and presentation are the feature's job.
 *
 * See `apps/api/src/integration-platform/services/README-check-results.md`
 * (and the `check-results-service` skill) for the usage map + examples.
 */
@Injectable()
export class CheckResultsService {
  constructor(
    private readonly checkRunRepo: CheckRunRepository,
    private readonly connectionRepository: ConnectionRepository,
  ) {}

  /**
   * Every active manifest — codebase OR dynamic — paired with its check bound to
   * the task template. Dynamic manifests are merged into the same registry, so
   * this is uniformly universal. Pairing (instead of re-finding the check later)
   * lets the type system carry the "bound check exists" guarantee.
   */
  private boundPairsForTask(
    taskTemplateId: TaskTemplateId,
  ): Array<{ manifest: IntegrationManifest; check: IntegrationCheck }> {
    return registry.getActiveManifests().flatMap((manifest) => {
      const check = manifest.checks?.find(
        (c) => c.taskMapping === taskTemplateId,
      );
      return check ? [{ manifest, check }] : [];
    });
  }

  /**
   * List the integrations that can supply results for a task in this org, with
   * each one's connection state. Use this to build a "source" selector or to
   * discover what's available. Returns ALL bound integrations (connected or not)
   * so the caller can decide how to present unconnected ones.
   */
  async listSourcesBoundToTask(
    organizationId: string,
    taskTemplateId: TaskTemplateId,
  ): Promise<CheckSourceInfo[]> {
    const pairs = this.boundPairsForTask(taskTemplateId);
    const connectionsBySlug =
      await this.connectionRepository.findActiveBySlugsAndOrg(
        pairs.map((p) => p.manifest.id),
        organizationId,
      );

    return pairs.map(({ manifest, check }) => {
      const connection = connectionsBySlug.get(manifest.id);
      return {
        slug: manifest.id,
        name: manifest.name,
        logoUrl: manifest.logoUrl ?? null,
        checkId: check.id,
        connected: !!connection,
        connectionId: connection?.id ?? null,
        lastSyncAt: connection?.lastSyncAt?.toISOString() ?? null,
        nextSyncAt: connection?.nextSyncAt?.toISOString() ?? null,
      };
    });
  }

  /**
   * The primitive: full results of a specific check's latest real run for a
   * specific connection. Everything else composes from this. Pass `resourceType`
   * to load only rows of that kind. Returns [] when the check has never really run.
   */
  async getLatestResultsByCheck({
    organizationId,
    connectionId,
    checkId,
    resourceType,
  }: {
    organizationId: string;
    connectionId: string;
    checkId: string;
    resourceType?: string;
  }): Promise<CheckResultRow[]> {
    const latest = await this.checkRunRepo.findLatestResultsByConnectionAndCheck(
      { connectionId, checkId, organizationId, resourceType },
    );
    if (!latest) return [];

    return latest.results.map((r) => ({
      resourceId: r.resourceId,
      resourceType: r.resourceType,
      passed: r.passed,
      title: r.title,
      description: r.description,
      evidence: r.evidence,
      collectedAt: r.collectedAt,
      runId: latest.run.id,
      connectionId,
    }));
  }

  /**
   * Convenience: results for a task-bound check from a chosen source (provider
   * slug). Resolves task -> check and slug -> connection, then fetches the
   * latest real run. Returns [] when the source isn't bound/connected or has no
   * real run. This is what a "pick a source, show its results" feature uses.
   */
  async getLatestResultsForTask({
    organizationId,
    taskTemplateId,
    sourceSlug,
    resourceType,
  }: {
    organizationId: string;
    taskTemplateId: TaskTemplateId;
    sourceSlug: string;
    resourceType?: string;
  }): Promise<CheckResultRow[]> {
    const pair = this.boundPairsForTask(taskTemplateId).find(
      (p) => p.manifest.id === sourceSlug,
    );
    if (!pair) return [];

    const connection = await this.connectionRepository.findBySlugAndOrg(
      sourceSlug,
      organizationId,
    );
    if (!connection) return [];

    return this.getLatestResultsByCheck({
      organizationId,
      connectionId: connection.id,
      checkId: pair.check.id,
      resourceType,
    });
  }
}
