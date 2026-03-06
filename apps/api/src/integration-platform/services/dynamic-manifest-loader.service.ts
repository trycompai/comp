import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  registry,
  interpretDeclarativeCheck,
  type IntegrationManifest,
  type AuthStrategy,
  type IntegrationCategory,
  type IntegrationCapability,
  type FindingSeverity,
  type CheckVariable,
} from '@comp/integration-platform';
import { DynamicIntegrationRepository, type DynamicIntegrationWithChecks } from '../repositories/dynamic-integration.repository';
import type { DynamicCheck } from '@prisma/client';

@Injectable()
export class DynamicManifestLoaderService implements OnModuleInit {
  private readonly logger = new Logger(DynamicManifestLoaderService.name);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly dynamicIntegrationRepo: DynamicIntegrationRepository,
  ) {}

  async onModuleInit() {
    try {
      await this.loadDynamicManifests();
      // Background refresh every 60 seconds as safety net
      this.refreshTimer = setInterval(() => {
        this.loadDynamicManifests().catch((err) => {
          this.logger.error('Background refresh failed', err);
        });
      }, 60_000);
    } catch (error) {
      this.logger.error('Failed to load dynamic manifests on boot', error);
    }
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
    this.logger.log(`Loaded ${manifests.length} dynamic integrations into registry`);
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

    return {
      id: integration.slug,
      name: integration.name,
      description: integration.description,
      category: integration.category as IntegrationCategory,
      logoUrl: integration.logoUrl,
      docsUrl: integration.docsUrl ?? undefined,
      auth,
      baseUrl: integration.baseUrl ?? undefined,
      defaultHeaders: (integration.defaultHeaders as Record<string, string>) ?? undefined,
      capabilities: (integration.capabilities as unknown as IntegrationCapability[]) ?? ['checks'],
      supportsMultipleConnections: integration.supportsMultipleConnections,
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
      definition: definition as Parameters<typeof interpretDeclarativeCheck>[0]['definition'],
      taskMapping: check.taskMapping ?? undefined,
      defaultSeverity: (check.defaultSeverity as FindingSeverity) ?? 'medium',
      variables: variables && variables.length > 0 ? variables : undefined,
    });
  }
}
