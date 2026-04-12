import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@db';
import { getManifest, getAvailableChecks, getAllManifests } from '@trycompai/integration-platform';
import { tasks } from '@trigger.dev/sdk';

@Injectable()
export class VendorIntegrationsService {
  private readonly logger = new Logger(VendorIntegrationsService.name);

  /** Get connected integrations + available unconnected ones matched by domain. */
  async getVendorIntegrations(vendorId: string, organizationId: string) {
    const vendor = await db.vendor.findFirst({
      where: { id: vendorId, organizationId },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor ${vendorId} not found in organization ${organizationId}`);
    }

    const connections = await db.integrationConnection.findMany({
      where: { vendorId, organizationId },
      include: { provider: true, vendorCheckConfigs: { where: { vendorId } } },
    });

    const connected = await Promise.all(
      connections.map(async (conn) => {
        // Get the latest completed check run per checkId for this connection
        const latestCheckRuns = await db.integrationCheckRun.findMany({
          where: { connectionId: conn.id, completedAt: { not: null } },
          orderBy: { createdAt: 'desc' },
          distinct: ['checkId'],
        });

        const manifest = getManifest(conn.provider.slug);
        const manifestChecks = manifest ? getAvailableChecks(manifest) : [];

        const checks = manifestChecks.map((mc) => {
          const config = conn.vendorCheckConfigs.find((c) => c.checkId === mc.id);
          const lastRun = latestCheckRuns.find((r) => r.checkId === mc.id);
          return {
            checkId: mc.id,
            checkName: mc.name,
            description: mc.description,
            enabled: config?.enabled ?? true,
            disabledReason: config?.disabledReason ?? null,
            lastRun: lastRun
              ? {
                  status: lastRun.status,
                  passedCount: lastRun.passedCount,
                  failedCount: lastRun.failedCount,
                  completedAt: lastRun.completedAt,
                }
              : null,
          };
        });

        return {
          connectionId: conn.id,
          providerSlug: conn.provider.slug,
          providerName: conn.provider.name,
          status: conn.status,
          lastSyncAt: conn.lastSyncAt,
          checks,
        };
      }),
    );

    const connectedSlugs = new Set(connections.map((c) => c.provider.slug));
    const available = await this.findAvailableProviders(vendor.name, vendor.website, connectedSlugs, organizationId);
    return { connected, available };
  }

  /** Link an existing connection to a vendor. Creates default VendorCheckConfig entries. */
  async connectIntegration(vendorId: string, organizationId: string, connectionId: string) {
    const vendor = await db.vendor.findFirst({ where: { id: vendorId, organizationId } });
    if (!vendor) {
      throw new NotFoundException(`Vendor ${vendorId} not found in organization ${organizationId}`);
    }

    const connection = await db.integrationConnection.findFirst({
      where: { id: connectionId, organizationId },
      include: { provider: true },
    });
    if (!connection) {
      throw new NotFoundException(`Connection ${connectionId} not found in organization ${organizationId}`);
    }

    await db.integrationConnection.update({
      where: { id: connectionId },
      data: { vendorId },
    });

    const manifest = getManifest(connection.provider.slug);
    if (manifest) {
      const checks = getAvailableChecks(manifest);
      await Promise.all(
        checks.map((check) =>
          db.vendorCheckConfig.upsert({
            where: {
              vendorId_connectionId_checkId: { vendorId, connectionId, checkId: check.id },
            },
            create: { vendorId, connectionId, checkId: check.id, enabled: true },
            update: {},
          }),
        ),
      );
    }

    this.logger.log(`Linked connection ${connectionId} to vendor ${vendorId}`);
    return { vendorId, connectionId, linked: true };
  }

  /** Unlink a connection from a vendor. Removes VendorCheckConfig entries. */
  async disconnectIntegration(vendorId: string, organizationId: string, connectionId: string) {
    // Validate vendor and connection belong to this organization
    const vendor = await db.vendor.findFirst({ where: { id: vendorId, organizationId } });
    if (!vendor) throw new NotFoundException(`Vendor ${vendorId} not found`);

    await db.integrationConnection.updateMany({
      where: { id: connectionId, vendorId, organizationId },
      data: { vendorId: null },
    });
    await db.vendorCheckConfig.deleteMany({ where: { vendorId, connectionId } });

    this.logger.log(`Unlinked connection ${connectionId} from vendor ${vendorId}`);
    return { vendorId, connectionId, linked: false };
  }

  /** Toggle a specific check for a vendor-connection pair. */
  async updateCheckConfig(
    vendorId: string,
    organizationId: string,
    connectionId: string,
    checkId: string,
    data: { enabled: boolean; disabledReason?: string },
  ) {
    const vendor = await db.vendor.findFirst({ where: { id: vendorId, organizationId } });
    if (!vendor) throw new NotFoundException(`Vendor ${vendorId} not found`);

    const connection = await db.integrationConnection.findFirst({ where: { id: connectionId, organizationId } });
    if (!connection) throw new NotFoundException(`Connection ${connectionId} not found`);

    return db.vendorCheckConfig.upsert({
      where: {
        vendorId_connectionId_checkId: { vendorId, connectionId, checkId },
      },
      create: {
        vendorId,
        connectionId,
        checkId,
        enabled: data.enabled,
        disabledReason: data.disabledReason ?? null,
      },
      update: {
        enabled: data.enabled,
        disabledReason: data.disabledReason ?? null,
      },
    });
  }

  /** Get aggregated check results for a vendor across all connected integrations. */
  async getCheckResults(vendorId: string, organizationId: string) {
    const connections = await db.integrationConnection.findMany({
      where: { vendorId, organizationId },
      include: { provider: true },
    });
    if (connections.length === 0) return [];

    return Promise.all(
      connections.map(async (conn) => {
        const latestRuns = await db.integrationCheckRun.findMany({
          where: { connectionId: conn.id },
          orderBy: { createdAt: 'desc' },
          distinct: ['checkId'],
          include: { results: true },
        });
        return {
          connectionId: conn.id,
          providerSlug: conn.provider.slug,
          providerName: conn.provider.name,
          checkRuns: latestRuns.map((run) => ({
            checkId: run.checkId,
            checkName: run.checkName,
            status: run.status,
            passedCount: run.passedCount,
            failedCount: run.failedCount,
            completedAt: run.completedAt,
            results: run.results.map((r) => ({
              id: r.id,
              passed: r.passed,
              resourceType: r.resourceType,
              resourceId: r.resourceId,
              title: r.title,
              description: r.description,
              severity: r.severity,
              remediation: r.remediation,
            })),
          })),
        };
      }),
    );
  }

  /** Get compact summary: { total, passing, failing, lastRunAt } */
  async getChecksSummary(vendorId: string, organizationId: string) {
    const connections = await db.integrationConnection.findMany({
      where: { vendorId, organizationId },
      select: { id: true },
    });
    if (connections.length === 0) {
      return { total: 0, passing: 0, failing: 0, lastRunAt: null };
    }

    const connectionIds = connections.map((c) => c.id);
    // Get the latest run per checkId per connection (one row per distinct check)
    const latestRuns = await db.integrationCheckRun.findMany({
      where: {
        connectionId: { in: connectionIds },
        completedAt: { not: null },
        checkId: { not: 'all' },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['checkId', 'connectionId'],
    });

    let passing = 0;
    let failing = 0;
    let lastRunAt: Date | null = null;

    for (const run of latestRuns) {
      if (run.failedCount === 0) passing++;
      else failing++;
      if (run.completedAt && (!lastRunAt || run.completedAt > lastRunAt)) {
        lastRunAt = run.completedAt;
      }
    }

    return { total: latestRuns.length, passing, failing, lastRunAt };
  }

  /** Get the latest results for a specific check on a vendor connection. */
  async getCheckDetail(vendorId: string, organizationId: string, connectionId: string, checkId: string) {
    // Validate vendor ownership
    const vendor = await db.vendor.findFirst({ where: { id: vendorId, organizationId } });
    if (!vendor) throw new NotFoundException(`Vendor ${vendorId} not found`);

    const latestRun = await db.integrationCheckRun.findFirst({
      where: { connectionId, checkId, completedAt: { not: null } },
      orderBy: { createdAt: 'desc' },
      include: { results: true },
    });

    if (!latestRun) return null;

    return {
      checkId: latestRun.checkId,
      checkName: latestRun.checkName,
      status: latestRun.status,
      passedCount: latestRun.passedCount,
      failedCount: latestRun.failedCount,
      completedAt: latestRun.completedAt,
      results: latestRun.results.map((r) => ({
        passed: r.passed,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        title: r.title,
        description: r.description,
        severity: r.severity,
        remediation: r.remediation,
      })),
    };
  }

  /** Build the prompt for AI remediation. Returns null if no failures. */
  async buildRemediationPrompt(vendorId: string, organizationId: string, connectionId: string, checkId: string) {
    const detail = await this.getCheckDetail(vendorId, organizationId, connectionId, checkId);
    if (!detail) return null;

    const failures = detail.results.filter((r) => !r.passed);
    if (failures.length === 0) return null;

    const failureSummary = failures.map((f) => {
      const parts = [`- ${f.title}`];
      if (f.description) parts.push(`  ${f.description}`);
      if (f.remediation) parts.push(`  Existing guidance: ${f.remediation}`);
      if (f.resourceId) parts.push(`  Resource: ${f.resourceId}`);
      return parts.join('\n');
    }).join('\n');

    return {
      checkName: detail.checkName,
      failureCount: failures.length,
      prompt: `The compliance check "${detail.checkName}" failed with ${failures.length} issue(s):\n\n${failureSummary}\n\nProvide a concise, actionable remediation.`,
    };
  }

  /** Get check run history grouped by day and checkId. Pass days=undefined for full history. */
  async getCheckHistory(vendorId: string, organizationId: string, days?: number) {
    const connections = await db.integrationConnection.findMany({
      where: { vendorId, organizationId },
      select: { id: true },
    });
    if (connections.length === 0) return [];

    const connectionIds = connections.map((c) => c.id);

    const completedAtFilter: { not: null; gte?: Date } = { not: null };
    if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      completedAtFilter.gte = since;
    }

    const runs = await db.integrationCheckRun.findMany({
      where: {
        connectionId: { in: connectionIds },
        completedAt: completedAtFilter,
        checkId: { not: 'all' },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        checkId: true,
        checkName: true,
        status: true,
        passedCount: true,
        failedCount: true,
        completedAt: true,
        connectionId: true,
      },
    });

    return runs.map((run) => ({
      checkId: run.checkId,
      checkName: run.checkName,
      connectionId: run.connectionId,
      status: run.status,
      passedCount: run.passedCount,
      failedCount: run.failedCount,
      completedAt: run.completedAt,
    }));
  }

  /** Trigger check runs for all active vendor-linked connections, respecting disabled checks. */
  async runVendorChecks(vendorId: string, organizationId: string) {
    const connections = await db.integrationConnection.findMany({
      where: { vendorId, organizationId, status: 'active' },
      include: { provider: true },
    });

    if (connections.length === 0) {
      return { triggered: 0 };
    }

    // Load disabled checks for this vendor
    const disabledConfigs = await db.vendorCheckConfig.findMany({
      where: { vendorId, enabled: false },
      select: { connectionId: true, checkId: true },
    });

    const disabledByConnection = new Map<string, string[]>();
    for (const cfg of disabledConfigs) {
      const ids = disabledByConnection.get(cfg.connectionId) ?? [];
      ids.push(cfg.checkId);
      disabledByConnection.set(cfg.connectionId, ids);
    }

    let triggered = 0;
    for (const conn of connections) {
      try {
        const skipCheckIds = disabledByConnection.get(conn.id) ?? [];
        await tasks.trigger('run-connection-checks', {
          connectionId: conn.id,
          organizationId,
          providerSlug: conn.provider.slug,
          skipCheckIds,
        });
        triggered++;
      } catch (error) {
        this.logger.error(`Failed to trigger checks for connection ${conn.id}:`, error);
      }
    }

    this.logger.log(`Triggered ${triggered} check run(s) for vendor ${vendorId}`);
    return { triggered };
  }

  /** Find available (unconnected) providers matching the vendor by domain or name. */
  private async findAvailableProviders(
    vendorName: string,
    website: string | null,
    connectedProviderSlugs: Set<string>,
    organizationId: string,
  ) {
    const domain = this.extractDomain(website);
    const nameNormalized = vendorName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Match against code-registered manifests (not DB rows, which are created lazily)
    const allManifests = getAllManifests().filter((m) => m.isActive);

    const matching = allManifests.filter((manifest) => {
      if (connectedProviderSlugs.has(manifest.id)) return false;
      if (domain && manifest.vendorMatchDomains?.includes(domain)) return true;
      const slugNormalized = manifest.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const providerNameNormalized = manifest.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (nameNormalized.includes(slugNormalized)) return true;
      if (nameNormalized.includes(providerNameNormalized)) return true;
      return false;
    });

    // Filter to only providers that have credentials configured (platform or org level)
    const configuredSlugs = new Set<string>();
    if (matching.length > 0) {
      const slugs = matching.map((m) => m.id);
      const [platformCreds, orgCreds] = await Promise.all([
        db.integrationPlatformCredential.findMany({
          where: { providerSlug: { in: slugs }, isActive: true },
          select: { providerSlug: true },
        }),
        db.integrationOAuthApp.findMany({
          where: { providerSlug: { in: slugs }, organizationId, isActive: true },
          select: { providerSlug: true },
        }),
      ]);
      for (const c of platformCreds) configuredSlugs.add(c.providerSlug);
      for (const c of orgCreds) configuredSlugs.add(c.providerSlug);

      // Non-OAuth providers (api_key, custom) don't need pre-configured credentials
      for (const m of matching) {
        if (m.auth.type !== 'oauth2') configuredSlugs.add(m.id);
      }
    }

    const configured = matching.filter((m) => configuredSlugs.has(m.id));

    return configured.map((manifest) => {
      const checks = getAvailableChecks(manifest);
      return {
        providerSlug: manifest.id,
        providerName: manifest.name,
        category: manifest.category,
        authType: manifest.auth.type,
        checks: checks.map((mc) => ({
          checkId: mc.id,
          checkName: mc.name,
          description: mc.description,
        })),
      };
    });
  }

  /** Extract domain from a URL string (e.g., "https://github.com" -> "github.com") */
  private extractDomain(website: string | null): string | null {
    if (!website) return null;
    const trimmed = website.trim();
    if (!trimmed) return null;

    try {
      const urlString = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const url = new URL(urlString);
      return url.hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return null;
    }
  }
}
