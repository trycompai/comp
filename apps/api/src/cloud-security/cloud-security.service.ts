import { Injectable, Logger } from '@nestjs/common';
import { db, Prisma } from '@db';
import { getManifest } from '@trycompai/integration-platform';
import { runs, tasks } from '@trigger.dev/sdk';
import { CredentialVaultService } from '../integration-platform/services/credential-vault.service';
import { OAuthCredentialsService } from '../integration-platform/services/oauth-credentials.service';
import { GCPSecurityService } from './providers/gcp-security.service';
import { AWSSecurityService } from './providers/aws-security.service';
import { AzureSecurityService } from './providers/azure-security.service';
import { AWS_SERVICE_TASK_MAPPINGS } from './aws-task-mappings';

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  resourceType: string;
  resourceId: string;
  remediation?: string;
  evidence?: Record<string, unknown>;
  createdAt: string;
  passed?: boolean; // Whether this is a passing check (default: false)
}

export interface ScanResult {
  success: boolean;
  provider: string;
  findings: SecurityFinding[];
  scannedAt: string;
  error?: string;
}

export class ConnectionNotFoundError extends Error {
  constructor() {
    super('Connection not found');
  }
}

@Injectable()
export class CloudSecurityService {
  private readonly logger = new Logger(CloudSecurityService.name);

  constructor(
    private readonly credentialVaultService: CredentialVaultService,
    private readonly oauthCredentialsService: OAuthCredentialsService,
    private readonly gcpService: GCPSecurityService,
    private readonly awsService: AWSSecurityService,
    private readonly azureService: AzureSecurityService,
  ) {}

  async scan(
    connectionId: string,
    organizationId: string,
  ): Promise<ScanResult> {
    this.logger.log(
      `Starting cloud security scan for connection ${connectionId}`,
    );

    // Get connection
    const connection = await db.integrationConnection.findFirst({
      where: {
        id: connectionId,
        organizationId,
        status: 'active',
      },
      include: {
        provider: true,
      },
    });

    if (!connection) {
      return {
        success: false,
        provider: 'unknown',
        findings: [],
        scannedAt: new Date().toISOString(),
        error: 'Connection not found or inactive',
      };
    }

    const providerSlug = connection.provider.slug;
    this.logger.log(`Scanning ${providerSlug} provider`);

    // Get credentials - for OAuth providers, handle token refresh
    let credentials: Record<string, unknown>;
    try {
      const manifest = getManifest(providerSlug);
      const isOAuth = manifest?.auth?.type === 'oauth2';

      if (isOAuth && manifest.auth.type === 'oauth2') {
        const oauthConfig = manifest.auth.config;

        // Get OAuth app credentials (decrypted)
        const oauthCreds = await this.oauthCredentialsService.getCredentials(
          providerSlug,
          organizationId,
        );

        if (!oauthCreds) {
          return {
            success: false,
            provider: providerSlug,
            findings: [],
            scannedAt: new Date().toISOString(),
            error: 'OAuth app not configured for this provider',
          };
        }

        // Get valid access token (with refresh if needed)
        const accessToken =
          await this.credentialVaultService.getValidAccessToken(connectionId, {
            tokenUrl: oauthConfig.tokenUrl,
            clientId: oauthCreds.clientId,
            clientSecret: oauthCreds.clientSecret,
            clientAuthMethod: oauthConfig.clientAuthMethod,
          });

        if (!accessToken) {
          return {
            success: false,
            provider: providerSlug,
            findings: [],
            scannedAt: new Date().toISOString(),
            error: 'OAuth token expired. Please reconnect the integration.',
          };
        }

        // Get full credentials and update with fresh access token
        const decrypted =
          await this.credentialVaultService.getDecryptedCredentials(
            connectionId,
          );
        credentials = { ...decrypted, access_token: accessToken };
      } else {
        // Non-OAuth (custom auth like AWS IAM Role)
        const decrypted =
          await this.credentialVaultService.getDecryptedCredentials(
            connectionId,
          );
        if (!decrypted) {
          return {
            success: false,
            provider: providerSlug,
            findings: [],
            scannedAt: new Date().toISOString(),
            error: 'No credentials found',
          };
        }
        credentials = decrypted;
      }
    } catch (error) {
      this.logger.error(`Failed to get credentials: ${error}`);
      return {
        success: false,
        provider: providerSlug,
        findings: [],
        scannedAt: new Date().toISOString(),
        error: 'Failed to get credentials',
      };
    }

    // Get variables for the scan
    const variables = (connection.variables as Record<string, unknown>) || {};

    // Provider baselines are always scanned regardless of toggles.
    const BASELINE_SERVICES_BY_PROVIDER: Record<string, string[]> = {
      aws: [
        'cloudtrail',
        'config',
        'guardduty',
        'iam-analyzer',
        'cloudwatch',
        'kms',
      ],
      gcp: ['security-command-center'],
      azure: [],
    };
    const baselineServices = BASELINE_SERVICES_BY_PROVIDER[providerSlug] ?? [];

    // Smart service filtering: auto-detect is additive, user can only exclude.
    // Scan = (detectedServices MINUS disabledServices) UNION baselineServices.
    const disabledServices = new Set<string>(
      Array.isArray(variables.disabledServices)
        ? (variables.disabledServices as string[])
        : [],
    );
    let enabledServices: string[] | undefined;

    if (
      Array.isArray(variables.enabledServices) &&
      (variables.enabledServices as string[]).length > 0
    ) {
      // Legacy format: explicit enabled list (backward compat) + baseline
      const userEnabled = (variables.enabledServices as string[]).filter(
        (s) => !disabledServices.has(s),
      );
      enabledServices = [...new Set([...userEnabled, ...baselineServices])];
    } else if (
      Array.isArray(variables.detectedServices) &&
      (variables.detectedServices as string[]).length > 0
    ) {
      // New smart format: detected minus disabled + baseline always included
      const filtered = (variables.detectedServices as string[]).filter(
        (s) => !disabledServices.has(s),
      );
      enabledServices = [...new Set([...filtered, ...baselineServices])];
    }
    // else: undefined = scan all adapters (no detection data at all)

    try {
      let findings: SecurityFinding[];

      // Auto-detect GCP org ID if not set
      if (
        providerSlug === 'gcp' &&
        !variables.organization_id &&
        credentials.access_token
      ) {
        this.logger.log('GCP org ID missing — auto-detecting...');
        try {
          const orgs = await this.gcpService.detectOrganizations(
            credentials.access_token as string,
          );
          if (orgs.length > 0) {
            variables.organization_id = orgs[0].id;
            this.logger.log(
              `Auto-detected GCP org: ${orgs[0].displayName} (${orgs[0].id})`,
            );
            // Save for future scans
            await db.integrationConnection.update({
              where: { id: connectionId },
              data: {
                variables: { ...variables } as unknown as Prisma.InputJsonValue,
              },
            });
          } else {
            this.logger.warn('No GCP organizations found for this account');
          }
        } catch (err) {
          this.logger.warn(
            `GCP org auto-detection failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      switch (providerSlug) {
        case 'gcp':
          findings = await this.gcpService.scanSecurityFindings(
            credentials,
            variables,
            enabledServices,
          );
          break;
        case 'aws':
          findings = await this.awsService.scanSecurityFindings(
            credentials,
            variables,
            enabledServices,
          );
          break;
        case 'azure':
          findings = await this.azureService.scanSecurityFindings(
            credentials,
            variables,
            enabledServices,
          );
          break;
        default:
          return {
            success: false,
            provider: providerSlug,
            findings: [],
            scannedAt: new Date().toISOString(),
            error: `Unsupported provider: ${providerSlug}`,
          };
      }

      // Store findings in database
      await this.storeFindings(connectionId, providerSlug, findings);

      // Auto-satisfy evidence tasks based on passing scan results (AWS only)
      if (providerSlug === 'aws') {
        await this.autoSatisfyTasks(organizationId, findings);
      }

      // GCP & Azure: auto-detect services from scan findings
      if (
        (providerSlug === 'gcp' || providerSlug === 'azure') &&
        findings.length > 0
      ) {
        const serviceIds = new Set<string>();
        for (const f of findings) {
          const evidence = f.evidence;
          const serviceId = evidence?.serviceId as string | undefined;
          if (serviceId) serviceIds.add(serviceId);
        }
        if (serviceIds.size > 0) {
          const currentVars = variables ?? {};
          const existingDetected = Array.isArray(currentVars.detectedServices)
            ? new Set(currentVars.detectedServices as string[])
            : new Set<string>();
          const disabledSet = new Set(
            Array.isArray(currentVars.disabledServices)
              ? (currentVars.disabledServices as string[])
              : [],
          );
          // Only auto-enable genuinely NEW services — don't override user's explicit disables
          for (const id of serviceIds) {
            if (!existingDetected.has(id)) disabledSet.delete(id);
          }
          // Merge: keep previously detected + add newly found (AFTER the new-check above)
          for (const id of serviceIds) existingDetected.add(id);
          await db.integrationConnection.update({
            where: { id: connectionId },
            data: {
              variables: {
                ...currentVars,
                detectedServices: [...existingDetected],
                disabledServices: [...disabledSet],
              } as unknown as Prisma.InputJsonValue,
            },
          });
          this.logger.log(
            `${providerSlug.toUpperCase()}: detected ${serviceIds.size} service categories: ${[...serviceIds].join(', ')}`,
          );
        }
      }

      // Update last sync time (AWS detectedServices is handled by detectServices via Cost Explorer)
      await db.integrationConnection.update({
        where: { id: connectionId },
        data: { lastSyncAt: new Date() },
      });

      this.logger.log(
        `Scan complete: ${findings.length} findings for ${providerSlug}`,
      );

      return {
        success: true,
        provider: providerSlug,
        findings,
        scannedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Scan failed for ${providerSlug}: ${errorMessage}`);

      return {
        success: false,
        provider: providerSlug,
        findings: [],
        scannedAt: new Date().toISOString(),
        error: errorMessage,
      };
    }
  }

  /**
   * Detect which AWS services are actively used (via Cost Explorer).
   * Saves detected services to connection variables for the frontend.
   */
  async detectServices(
    connectionId: string,
    organizationId: string,
  ): Promise<string[]> {
    const connection = await db.integrationConnection.findFirst({
      where: { id: connectionId, organizationId, status: 'active' },
      include: { provider: true },
    });

    if (!connection) {
      throw new ConnectionNotFoundError();
    }

    const decrypted =
      await this.credentialVaultService.getDecryptedCredentials(connectionId);
    if (!decrypted) {
      throw new Error('No credentials found');
    }

    const variables = (connection.variables as Record<string, unknown>) || {};
    let detected: string[];
    let gcpServicesByProject: Record<string, string[]> | undefined;

    if (connection.provider.slug === 'gcp') {
      const accessToken = decrypted.access_token as string;
      if (!accessToken) throw new Error('GCP access token not found');

      // Use explicitly selected projects, otherwise detect all (cron fallback)
      const selectedIds = Array.isArray(variables.project_ids)
        ? (variables.project_ids as string[])
        : [];

      const projects =
        selectedIds.length > 0
          ? selectedIds.map((id) => ({ id }))
          : await this.gcpService.detectProjects(accessToken);
      const result = await this.gcpService.detectServices(
        accessToken,
        projects,
      );
      detected = result.services;
      gcpServicesByProject = result.servicesByProject;
    } else if (connection.provider.slug === 'aws') {
      detected = await this.awsService.detectActiveServices(
        decrypted,
        variables,
      );
    } else {
      // Azure and others: services are auto-detected from scan findings, not a separate API
      return [];
    }

    // Merge with existing detected services and only auto-enable genuinely NEW detections.
    // This preserves explicit user toggles (both enabled and disabled).
    const existingDetected = new Set<string>(
      Array.isArray(variables.detectedServices)
        ? (variables.detectedServices as string[])
        : [],
    );
    const updatedDisabled = new Set<string>(
      Array.isArray(variables.disabledServices)
        ? (variables.disabledServices as string[])
        : [],
    );
    for (const id of detected) {
      if (!existingDetected.has(id)) {
        updatedDisabled.delete(id);
      }
      existingDetected.add(id);
    }

    await db.integrationConnection.update({
      where: { id: connectionId },
      data: {
        variables: {
          ...variables,
          detectedServices: [...existingDetected],
          disabledServices: [...updatedDisabled],
          serviceDetectionCompletedAt: new Date().toISOString(),
          ...(gcpServicesByProject && { servicesByProject: gcpServicesByProject }),
        },
      },
    });

    this.logger.log(
      `Detected ${detected.length} active services for ${connection.provider.slug} connection ${connectionId}`,
    );

    return detected;
  }

  /**
   * Get connection with decrypted credentials (for GCP org detection).
   */
  async getConnectionForDetect(connectionId: string, organizationId: string) {
    const connection = await db.integrationConnection.findFirst({
      where: { id: connectionId, organizationId, status: 'active' },
      include: { provider: true },
    });
    if (!connection) throw new ConnectionNotFoundError();

    const credentials =
      await this.credentialVaultService.getDecryptedCredentials(connectionId);
    return { ...connection, credentials };
  }

  /**
   * Save a variable to a connection (e.g., organization_id after auto-detection).
   */
  async saveConnectionVariable(
    connectionId: string,
    key: string,
    value: string | string[],
    organizationId: string,
  ) {
    const connection = await db.integrationConnection.findFirst({
      where: { id: connectionId, organizationId },
    });
    if (!connection) throw new ConnectionNotFoundError();

    const variables = (connection.variables as Record<string, unknown>) || {};
    await db.integrationConnection.update({
      where: { id: connectionId },
      data: {
        variables: {
          ...variables,
          [key]: value,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async triggerScan(
    connectionId: string,
    organizationId: string,
  ): Promise<{ runId: string }> {
    // Validate connection exists and is active
    const connection = await db.integrationConnection.findFirst({
      where: {
        id: connectionId,
        organizationId,
        status: 'active',
      },
    });

    if (!connection) {
      throw new Error('Connection not found or inactive');
    }

    const handle = await tasks.trigger('run-cloud-security-scan', {
      connectionId,
      organizationId,
      providerSlug: 'platform',
      connectionName: connectionId,
    });

    this.logger.log(`Triggered cloud security scan task`, {
      connectionId,
      runId: handle.id,
    });

    return { runId: handle.id };
  }

  async getRunStatus(
    runId: string,
    connectionId: string,
    organizationId: string,
  ): Promise<{ completed: boolean; success: boolean; output: unknown }> {
    // Verify the connection belongs to the caller's organization
    const connection = await db.integrationConnection.findFirst({
      where: {
        id: connectionId,
        organizationId,
      },
      select: { id: true },
    });

    if (!connection) {
      throw new ConnectionNotFoundError();
    }

    const run = await runs.retrieve(runId);

    return {
      completed: run.isCompleted,
      success: run.isCompleted ? run.isSuccess : false,
      output: run.isCompleted ? run.output : null,
    };
  }

  private async storeFindings(
    connectionId: string,
    provider: string,
    findings: SecurityFinding[],
  ): Promise<void> {
    const passedCount = findings.filter((f) => f.passed).length;
    const failedCount = findings.filter((f) => !f.passed).length;

    // Use a transaction to ensure atomicity - both run and results are created together
    await db.$transaction(async (tx) => {
      // Create a scan run record
      const scanRun = await tx.integrationCheckRun.create({
        data: {
          connectionId,
          checkId: `${provider}-security-scan`,
          checkName: `${provider.toUpperCase()} Security Scan`,
          status: 'success',
          startedAt: new Date(),
          completedAt: new Date(),
          totalChecked: findings.length,
          passedCount,
          failedCount,
        },
      });

      // Store each finding as a check result
      if (findings.length > 0) {
        await tx.integrationCheckResult.createMany({
          data: findings.map((finding) => ({
            checkRunId: scanRun.id,
            passed: finding.passed ?? false,
            resourceType: finding.resourceType,
            resourceId: finding.resourceId,
            title: finding.title,
            description: finding.description ?? '',
            severity: finding.passed ? 'info' : finding.severity,
            remediation: finding.remediation ?? null,
            evidence: (finding.evidence || {}) as object,
            collectedAt: new Date(finding.createdAt),
          })),
        });
      }
    });
  }

  /**
   * Auto-satisfy evidence tasks when ALL findings for a service pass.
   *
   * Safety rules:
   * - Only sets tasks to 'done' — never failed/in_progress/todo
   * - Only when ALL findings pass for a service
   * - Skips tasks with status 'not_relevant' (user intent)
   * - Skips tasks already 'done' (idempotent)
   * - Idempotent: re-running with same results is safe
   */
  private async autoSatisfyTasks(
    organizationId: string,
    findings: SecurityFinding[],
  ): Promise<void> {
    // Group findings by serviceId
    const findingsByService = new Map<string, SecurityFinding[]>();
    for (const finding of findings) {
      const serviceId = finding.evidence?.serviceId as string | undefined;
      if (!serviceId) continue;
      const group = findingsByService.get(serviceId) ?? [];
      group.push(finding);
      findingsByService.set(serviceId, group);
    }

    // Find services where ALL findings pass
    const passingServices: string[] = [];
    for (const [serviceId, serviceFindings] of findingsByService) {
      if (
        serviceFindings.length > 0 &&
        serviceFindings.every((f) => f.passed)
      ) {
        passingServices.push(serviceId);
      }
    }

    if (passingServices.length === 0) return;

    // Collect all task template IDs to satisfy
    const templateIds = new Set<string>();
    for (const serviceId of passingServices) {
      const mappedTemplates = AWS_SERVICE_TASK_MAPPINGS[serviceId];
      if (mappedTemplates) {
        for (const id of mappedTemplates) {
          templateIds.add(id);
        }
      }
    }

    if (templateIds.size === 0) return;

    // For each template ID, only satisfy if ALL mapped services pass.
    // A task template may be linked to multiple services (e.g. Encryption at Rest
    // requires KMS + S3 + RDS + DynamoDB). Only mark done if every scanned
    // service that maps to this template is fully passing.
    const eligibleTemplateIds: string[] = [];
    for (const templateId of templateIds) {
      // Find all services that map to this template
      const servicesForTemplate = Object.entries(AWS_SERVICE_TASK_MAPPINGS)
        .filter(([, templates]) => templates.includes(templateId))
        .map(([serviceId]) => serviceId);

      // Only consider services that were actually scanned
      const scannedServicesForTemplate = servicesForTemplate.filter((s) =>
        findingsByService.has(s),
      );

      // If no services were scanned for this template, skip
      if (scannedServicesForTemplate.length === 0) continue;

      // All scanned services for this template must be passing
      const allPassing = scannedServicesForTemplate.every((s) =>
        passingServices.includes(s),
      );

      if (allPassing) {
        eligibleTemplateIds.push(templateId);
      }
    }

    if (eligibleTemplateIds.length === 0) return;

    const now = new Date();

    // Update tasks: only those in todo/in_progress/in_review/failed status
    const result = await db.task.updateMany({
      where: {
        organizationId,
        taskTemplateId: { in: eligibleTemplateIds },
        status: { in: ['todo', 'in_progress', 'in_review', 'failed'] },
      },
      data: {
        status: 'done',
        lastCompletedAt: now,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Auto-satisfied ${result.count} evidence task(s) from passing AWS scan (services: ${passingServices.join(', ')})`,
      );
    }
  }
}
