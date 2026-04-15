import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@db';
import {
  registry,
  interpretDeclarativeCheck,
  type IntegrationManifest,
  type IntegrationService,
  type AuthStrategy,
  type IntegrationCategory,
  type IntegrationCapability,
  type FindingSeverity,
  type CheckVariable,
} from '@trycompai/integration-platform';
import {
  DynamicIntegrationRepository,
  type DynamicIntegrationWithChecks,
} from '../repositories/dynamic-integration.repository';
import type { DynamicCheck } from '@db';

@Injectable()
export class DynamicManifestLoaderService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DynamicManifestLoaderService.name);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly dynamicIntegrationRepo: DynamicIntegrationRepository,
  ) {}

  async onModuleInit() {
    try {
      await this.loadDynamicManifests();
    } catch (error) {
      this.logManifestLoadFailure(error, 'boot');
    }

    // Always schedule refresh so manifests load after Postgres comes online (common in local dev).
    this.refreshTimer = setInterval(() => {
      this.loadDynamicManifests().catch((err) => {
        if (this.isDatabaseUnavailable(err)) {
          this.logger.debug(
            'Dynamic manifests skipped: database still unreachable',
          );
          return;
        }
        this.logger.error(
          'Background refresh of dynamic manifests failed',
          err,
        );
      });
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private isDatabaseUnavailable(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return true;
    }
    if (error instanceof Error) {
      return error.message.includes("Can't reach database server");
    }
    return false;
  }

  private logManifestLoadFailure(error: unknown, phase: 'boot') {
    if (this.isDatabaseUnavailable(error)) {
      this.logger.warn(
        'Dynamic integration manifests not loaded: database unreachable. Start Postgres (e.g. packages/db docker) or set DATABASE_URL. Manifests will load when the DB is reachable.',
      );
      return;
    }
    this.logger.error(`Failed to load dynamic manifests on ${phase}`, error);
  }

  /**
   * Load all active dynamic integrations from DB and merge into the registry.
   */
  async loadDynamicManifests(): Promise<void> {
    const integrations = await this.dynamicIntegrationRepo.findActive();

    const manifests: IntegrationManifest[] = [];

    for (const integration of integrations) {
      try {
        const manifest = this.convertToManifest(integration);
        manifests.push(manifest);
      } catch (error) {
        this.logger.error(
          `Failed to convert dynamic integration "${integration.slug}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    registry.refreshDynamic(manifests);
    this.logger.log(
      `Loaded ${manifests.length} dynamic integrations into registry`,
    );
  }

  /**
   * Invalidate cache — force reload from DB.
   * Call this after creating/updating/deleting dynamic integrations.
   */
  async invalidateCache(): Promise<void> {
    await this.loadDynamicManifests();
  }

  /**
   * Convert a DynamicIntegration (DB row) + checks into an IntegrationManifest.
   */
  private convertToManifest(
    integration: DynamicIntegrationWithChecks,
  ): IntegrationManifest {
    const authConfig = integration.authConfig as Record<string, unknown>;
    const auth: AuthStrategy = {
      type: authConfig.type as AuthStrategy['type'],
      config: authConfig.config as AuthStrategy['config'],
    } as AuthStrategy;

    const checks = integration.checks.map((check) =>
      this.convertCheck(check, integration.slug),
    );

    // Collect manifest-level variables from syncDefinition (if present)
    // These appear in the customer configuration UI (ManageIntegrationDialog)
    const syncDef = integration.syncDefinition as Record<
      string,
      unknown
    > | null;
    const syncVariables = syncDef?.variables as CheckVariable[] | undefined;

    return {
      id: integration.slug,
      name: integration.name,
      description: integration.description,
      category: integration.category as IntegrationCategory,
      logoUrl: integration.logoUrl,
      docsUrl: integration.docsUrl ?? undefined,
      auth,
      baseUrl: integration.baseUrl ?? undefined,
      defaultHeaders:
        (integration.defaultHeaders as Record<string, string>) ?? undefined,
      capabilities:
        (integration.capabilities as unknown as IntegrationCapability[]) ?? [
          'checks',
        ],
      supportsMultipleConnections: integration.supportsMultipleConnections,
      variables:
        syncVariables && syncVariables.length > 0 ? syncVariables : undefined,
      services:
        (integration.services as IntegrationService[] | null) ?? undefined,
      checks,
      isActive: integration.isActive,
    };
  }

  /**
   * Convert a DynamicCheck (DB row) into an IntegrationCheck using the DSL interpreter.
   */
  private convertCheck(check: DynamicCheck, _integrationSlug: string) {
    const definition = check.definition as Record<string, unknown>;
    const variables = check.variables as unknown as CheckVariable[] | undefined;

    return interpretDeclarativeCheck({
      id: check.checkSlug,
      name: check.name,
      description: check.description,
      definition: definition as Parameters<
        typeof interpretDeclarativeCheck
      >[0]['definition'],
      taskMapping: check.taskMapping ?? undefined,
      defaultSeverity: (check.defaultSeverity as FindingSeverity) ?? 'medium',
      variables: variables && variables.length > 0 ? variables : undefined,
      service: check.service ?? undefined,
    });
  }
}
