import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { OrganizationId } from '../auth/auth-context.decorator';
import {
  CloudSecurityService,
  ConnectionNotFoundError,
} from './cloud-security.service';
import { CloudSecurityQueryService } from './cloud-security-query.service';
import { CloudSecurityLegacyService } from './cloud-security-legacy.service';
import { logCloudSecurityActivity } from './cloud-security-audit';
import { CloudSecurityActivityService } from './cloud-security-activity.service';
import {
  GCPSecurityService,
  type GcpSetupStep,
  type GcpSetupStepId,
} from './providers/gcp-security.service';
import { AzureSecurityService } from './providers/azure-security.service';

@Controller({ path: 'cloud-security', version: '1' })
export class CloudSecurityController {
  private readonly logger = new Logger(CloudSecurityController.name);

  constructor(
    private readonly cloudSecurityService: CloudSecurityService,
    private readonly queryService: CloudSecurityQueryService,
    private readonly legacyService: CloudSecurityLegacyService,
    private readonly activityService: CloudSecurityActivityService,
    private readonly gcpSecurityService: GCPSecurityService,
    private readonly azureSecurityService: AzureSecurityService,
  ) {}

  @Get('activity')
  @SkipThrottle()
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'read')
  async getActivity(
    @Query('connectionId') connectionId: string,
    @Query('take') take: string | undefined,
    @OrganizationId() organizationId: string,
  ) {
    if (!connectionId) {
      throw new HttpException(
        'connectionId query parameter is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const parsedTake = take
      ? Math.min(100, Math.max(1, parseInt(take, 10) || 30))
      : 30;

    const activity = await this.activityService.getActivity({
      connectionId,
      organizationId,
      take: parsedTake,
    });

    return { data: activity, count: activity.length };
  }

  @Get('providers')
  @SkipThrottle()
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'read')
  async getProviders(@OrganizationId() organizationId: string) {
    const providers = await this.queryService.getProviders(organizationId);
    return { data: providers, count: providers.length };
  }

  @Get('findings')
  @SkipThrottle()
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'read')
  async getFindings(@OrganizationId() organizationId: string) {
    const findings = await this.queryService.getFindings(organizationId);
    return { data: findings, count: findings.length };
  }

  @Post('scan/:connectionId')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'update')
  async scan(
    @Param('connectionId') connectionId: string,
    @OrganizationId() organizationId: string,
    @Req() req: { userId?: string; authType?: string },
  ) {
    this.logger.log(
      `Cloud security scan requested for connection ${connectionId}`,
    );

    const result = await this.cloudSecurityService.scan(
      connectionId,
      organizationId,
    );

    if (!result.success) {
      // GCP setup issues are user-fixable — return 400 with structured error
      const isSetupError =
        result.error?.startsWith('SCC_NOT_ACTIVATED:') ||
        result.error?.startsWith('GCP_ORG_MISSING:');
      const errorStr = result.error ?? '';
      const errorCode = isSetupError ? errorStr.split(':')[0] : undefined;
      const message = isSetupError
        ? errorStr.substring(errorStr.indexOf(':') + 2)
        : result.error || 'Scan failed';

      throw new HttpException(
        {
          message,
          provider: result.provider,
          ...(errorCode && { errorCode }),
        },
        isSetupError
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const totalFindings = result.findings.length;
    const failedCount = result.findings.filter((f) => !f.passed).length;
    const passedCount = result.findings.filter((f) => f.passed).length;

    // Only write audit log when we have a real userId (session auth).
    // API key auth has no user context, and auditLog.userId is a FK to User.
    const scanUserId = req.userId;
    if (scanUserId)
      await logCloudSecurityActivity({
        organizationId,
        userId: scanUserId,
        connectionId,
        action: 'scan_completed',
        description: `Ran cloud security scan — ${totalFindings} findings (${failedCount} failed, ${passedCount} passed)`,
        metadata: {
          totalFindings,
          failedCount,
          passedCount,
          provider: result.provider,
        },
      });

    return {
      success: true,
      provider: result.provider,
      findingsCount: totalFindings,
      scannedAt: result.scannedAt,
    };
  }

  @Post('detect-services/:connectionId')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'read')
  async detectServices(
    @Param('connectionId') connectionId: string,
    @OrganizationId() organizationId: string,
  ) {
    try {
      const services = await this.cloudSecurityService.detectServices(
        connectionId,
        organizationId,
      );
      return { services };
    } catch (error) {
      if (error instanceof ConnectionNotFoundError) {
        throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
      }
      const message =
        error instanceof Error ? error.message : 'Failed to detect services';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('detect-gcp-org/:connectionId')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'read')
  async detectGcpOrg(
    @Param('connectionId') connectionId: string,
    @OrganizationId() organizationId: string,
  ) {
    try {
      const connection = await this.cloudSecurityService.getConnectionForDetect(
        connectionId,
        organizationId,
      );

      const credentials = connection.credentials as Record<string, unknown>;
      const accessToken = credentials?.access_token as string;
      if (!accessToken) {
        throw new Error(
          'No access token found. Reconnect the GCP integration.',
        );
      }

      const rawOrgs =
        await this.gcpSecurityService.detectOrganizations(accessToken);

      // Fetch projects per org in parallel
      const orgsWithProjects = await Promise.all(
        rawOrgs.map(async (org) => {
          const projects =
            await this.gcpSecurityService.detectProjectsForOrg(
              accessToken,
              org.id,
            );
          return {
            id: org.id,
            displayName: org.displayName,
            projects: projects
              .map((p) => ({ id: p.id, name: p.name, number: p.number }))
              .sort((a, b) => a.name.localeCompare(b.name)),
          };
        }),
      );

      // If exactly 1 org found, auto-save it
      if (rawOrgs.length === 1) {
        await this.cloudSecurityService.saveConnectionVariable(
          connectionId,
          'organization_id',
          rawOrgs[0].id,
          organizationId,
        );
      }

      const variables = (connection.variables ?? {}) as Record<
        string,
        unknown
      >;

      // Return only explicitly selected projects — never auto-select
      const existingProjectIds = this.readProjectIds(variables);

      return {
        organizations: orgsWithProjects,
        selectedProjectIds: existingProjectIds,
        selectedOrganizationId: variables.organization_id as string | undefined,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to detect GCP organization';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('select-gcp-projects/:connectionId')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'update')
  async selectGcpProjects(
    @Param('connectionId') connectionId: string,
    @Body()
    body: {
      projectIds: string[];
      projectNames?: Record<string, string>;
      gcpOrganizationId?: string;
    },
    @OrganizationId() organizationId: string,
  ) {
    if (!body?.projectIds?.length) {
      throw new HttpException(
        'projectIds is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (body.gcpOrganizationId) {
      await this.cloudSecurityService.saveConnectionVariable(
        connectionId,
        'organization_id',
        body.gcpOrganizationId,
        organizationId,
      );
    }
    await this.cloudSecurityService.saveConnectionVariable(
      connectionId,
      'project_ids',
      body.projectIds,
      organizationId,
    );
    if (body.projectNames) {
      await this.cloudSecurityService.saveConnectionVariable(
        connectionId,
        'project_names',
        body.projectNames as unknown as string[],
        organizationId,
      );
    }
    return { projectIds: body.projectIds };
  }

  @Post('setup-gcp/:connectionId')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'update')
  async setupGcp(
    @Param('connectionId') connectionId: string,
    @Body() body: { projectId?: string },
    @OrganizationId() organizationId: string,
  ) {
    try {
      const context = await this.resolveGcpSetupContext(
        connectionId,
        organizationId,
        body?.projectId,
      );

      const result = await this.gcpSecurityService.autoSetup({
        accessToken: context.accessToken,
        organizationId: context.organizationId ?? '',
        projectId: context.projectId,
      });

      return {
        ...result,
        steps: this.withGcpResolveActions(result.steps, connectionId),
        organizationId: context.organizationId,
        projectId: context.projectId,
        projects: context.projects,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'GCP setup failed';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('setup-gcp/:connectionId/resolve-step')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'update')
  async resolveGcpSetupStep(
    @Param('connectionId') connectionId: string,
    @Body() body: { stepId: GcpSetupStepId },
    @OrganizationId() organizationId: string,
  ) {
    try {
      if (!body?.stepId) {
        throw new Error('stepId is required');
      }

      const context = await this.resolveGcpSetupContext(
        connectionId,
        organizationId,
      );
      const result = await this.gcpSecurityService.resolveSetupStep({
        stepId: body.stepId,
        accessToken: context.accessToken,
        organizationId: context.organizationId ?? '',
        projectId: context.projectId,
      });

      return {
        email: result.email,
        step: this.withGcpResolveActions([result.step], connectionId)[0],
        organizationId: context.organizationId,
        projectId: context.projectId,
        projects: context.projects,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to resolve setup step';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  private withGcpResolveActions(
    steps: GcpSetupStep[],
    connectionId: string,
  ): GcpSetupStep[] {
    return steps.map((step) => {
      if (step.success) return step;
      return {
        ...step,
        resolveAction: {
          label: 'Resolve this',
          method: 'POST',
          endpoint: `/v1/cloud-security/setup-gcp/${connectionId}/resolve-step`,
          body: { stepId: step.id },
        },
      };
    });
  }

  /**
   * Read selected project IDs from connection variables.
   * Only reads the new `project_ids` array — the old `project_id` string
   * was auto-saved by previous code and does NOT represent user choice.
   */
  private readProjectIds(
    variables: Record<string, unknown>,
  ): string[] {
    if (Array.isArray(variables.project_ids)) {
      return variables.project_ids as string[];
    }
    return [];
  }

  private async resolveGcpSetupContext(
    connectionId: string,
    organizationId: string,
    overrideProjectId?: string,
  ) {
    const connection = await this.cloudSecurityService.getConnectionForDetect(
      connectionId,
      organizationId,
    );

    const credentials = connection.credentials as Record<string, unknown>;
    const accessToken = credentials?.access_token as string;
    if (!accessToken) {
      throw new Error('No access token found. Reconnect the GCP integration.');
    }

    const variables = (connection.variables ?? {}) as Record<string, unknown>;
    let gcpOrgId = variables.organization_id as string | undefined;

    if (!gcpOrgId) {
      const orgs =
        await this.gcpSecurityService.detectOrganizations(accessToken);
      if (orgs.length > 0) {
        gcpOrgId = orgs[0].id;
        await this.cloudSecurityService.saveConnectionVariable(
          connectionId,
          'organization_id',
          gcpOrgId,
          organizationId,
        );
      }
    }

    // Fetch projects scoped to the org when available, else all
    const projects = gcpOrgId
      ? await this.gcpSecurityService.detectProjectsForOrg(
          accessToken,
          gcpOrgId,
        )
      : await this.gcpSecurityService.detectProjects(accessToken);

    // For API enablement, use override or first selected project
    const selectedIds = this.readProjectIds(variables);
    const projectId =
      overrideProjectId || selectedIds[0] || projects[0]?.id;

    if (!projectId) {
      throw new Error(
        'No GCP projects found. Ensure your account has access to at least one project.',
      );
    }

    return {
      accessToken,
      organizationId: gcpOrgId,
      projectId,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
      })),
      selectedProjectIds: selectedIds,
    };
  }

  @Post('setup-azure/:connectionId')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'update')
  async setupAzure(
    @Param('connectionId') connectionId: string,
    @OrganizationId() organizationId: string,
  ) {
    try {
      const connection = await this.cloudSecurityService.getConnectionForDetect(
        connectionId,
        organizationId,
      );

      const credentials = connection.credentials as Record<string, unknown>;
      const accessToken = credentials?.access_token as string;
      if (!accessToken) {
        throw new Error(
          'No access token found. Reconnect the Azure integration.',
        );
      }

      const variables = (connection.variables ?? {}) as Record<string, unknown>;
      const steps: Array<{ name: string; success: boolean; error?: string }> =
        [];

      // Step 1: Detect subscriptions
      let subscriptionId = variables.subscription_id as string | undefined;
      let subscriptionName: string | undefined;
      try {
        const subs =
          await this.azureSecurityService.detectSubscriptions(accessToken);
        if (subs.length > 0) {
          subscriptionId = subs[0].id;
          subscriptionName = subs[0].displayName;
          await this.cloudSecurityService.saveConnectionVariable(
            connectionId,
            'subscription_id',
            subscriptionId,
            organizationId,
          );
          steps.push({
            name: `Subscription detected: ${subscriptionName}`,
            success: true,
          });
        } else {
          steps.push({
            name: 'Detect subscription',
            success: false,
            error:
              'No Azure subscriptions found. Ensure your account has an active subscription.',
          });
        }
      } catch (error) {
        steps.push({
          name: 'Detect subscription',
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to detect subscriptions',
        });
      }

      // Step 2: Verify Defender access
      if (subscriptionId) {
        try {
          const resp = await fetch(
            `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Security/assessments?api-version=2021-06-01&$top=1`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          if (resp.ok) {
            steps.push({
              name: 'Microsoft Defender for Cloud access verified',
              success: true,
            });
          } else {
            steps.push({
              name: 'Microsoft Defender for Cloud access',
              success: false,
              error:
                'Your account needs the "Security Reader" role on this subscription.',
            });
          }
        } catch {
          steps.push({
            name: 'Microsoft Defender for Cloud access',
            success: false,
            error: 'Could not verify Defender access.',
          });
        }

        // Step 3: Verify general read access
        try {
          const resp = await fetch(
            `https://management.azure.com/subscriptions/${subscriptionId}/resources?api-version=2021-04-01&$top=1`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          if (resp.ok) {
            steps.push({
              name: 'Resource read access verified',
              success: true,
            });
          } else {
            steps.push({
              name: 'Resource read access',
              success: false,
              error:
                'Your account needs at least the "Reader" role on this subscription.',
            });
          }
        } catch {
          steps.push({
            name: 'Resource read access',
            success: false,
            error: 'Verification failed',
          });
        }

        // Step 4: Check write permissions for auto-fix
        // Use the permissions check API to see if user can write resources
        let canAutoFix = false;
        try {
          const permResp = await fetch(
            `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/permissions?api-version=2022-04-01`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          if (permResp.ok) {
            const permData = (await permResp.json()) as {
              value: Array<{ actions: string[]; notActions: string[] }>;
            };
            const allActions = permData.value?.flatMap((p) => p.actions) ?? [];
            canAutoFix = allActions.some((a) => a === '*' || a === '*/write');
            if (canAutoFix) {
              steps.push({
                name: 'Auto-fix capability: write access available',
                success: true,
              });
            } else {
              steps.push({
                name: 'Auto-fix capability',
                success: true,
                error:
                  'Read-only access. Auto-fix requires Contributor role — you can still scan and view findings.',
              });
            }
          }
        } catch {
          // Non-critical — auto-fix detection failed
        }
      }

      return {
        steps,
        subscriptionId,
        subscriptionName,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Azure setup failed';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('validate-azure/:connectionId')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'read')
  async validateAzure(
    @Param('connectionId') connectionId: string,
    @OrganizationId() organizationId: string,
  ) {
    try {
      const connection = await this.cloudSecurityService.getConnectionForDetect(
        connectionId,
        organizationId,
      );

      const credentials = connection.credentials as Record<string, unknown>;
      const variables = (connection.variables ?? {}) as Record<string, unknown>;
      const tenantId = credentials?.tenantId as string;
      const clientId = credentials?.clientId as string;
      const clientSecret = credentials?.clientSecret as string;
      const subscriptionId = (credentials?.subscriptionId ??
        variables.subscription_id) as string | undefined;

      const steps: Array<{ name: string; success: boolean; error?: string }> =
        [];

      if (!subscriptionId) {
        steps.push({
          name: 'Subscription ID',
          success: false,
          error:
            'No subscription ID configured. Go to the Azure integration settings to auto-detect your subscription.',
        });
        return { steps, subscriptionId: null };
      }

      // Step 1: Validate credentials (token exchange)
      let accessToken: string | null = null;
      try {
        accessToken = await this.azureSecurityService.getAccessToken(
          tenantId,
          clientId,
          clientSecret,
        );
        steps.push({ name: 'Authenticate with Azure', success: true });
      } catch (error) {
        steps.push({
          name: 'Authenticate with Azure',
          success: false,
          error:
            error instanceof Error ? error.message : 'Authentication failed',
        });
        return { steps, subscriptionId };
      }

      // Step 2: Verify subscription access
      try {
        const resp = await fetch(
          `https://management.azure.com/subscriptions/${subscriptionId}?api-version=2022-12-01`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (resp.ok) {
          steps.push({ name: 'Subscription access verified', success: true });
        } else {
          const errorText = await resp.text();
          steps.push({
            name: 'Subscription access',
            success: false,
            error: `Cannot access subscription. Assign "Reader" role to the app registration. (${resp.status}: ${errorText.slice(0, 200)})`,
          });
        }
      } catch {
        steps.push({
          name: 'Subscription access',
          success: false,
          error: 'Network error',
        });
      }

      // Step 3: Verify Defender access
      try {
        const resp = await fetch(
          `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Security/assessments?api-version=2021-06-01&$top=1`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (resp.ok) {
          steps.push({
            name: 'Microsoft Defender for Cloud access',
            success: true,
          });
        } else {
          steps.push({
            name: 'Microsoft Defender for Cloud access',
            success: false,
            error: 'Assign "Security Reader" role to the app registration.',
          });
        }
      } catch {
        steps.push({
          name: 'Microsoft Defender for Cloud access',
          success: false,
          error: 'Could not verify Defender access',
        });
      }

      return { steps, subscriptionId };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Azure validation failed';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('trigger/:connectionId')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'update')
  async triggerScan(
    @Param('connectionId') connectionId: string,
    @OrganizationId() organizationId: string,
  ) {
    this.logger.log(
      `Cloud security scan trigger requested for connection ${connectionId}`,
    );

    try {
      const result = await this.cloudSecurityService.triggerScan(
        connectionId,
        organizationId,
      );
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to trigger scan';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('runs/:runId')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'read')
  async getRunStatus(
    @Param('runId') runId: string,
    @Query('connectionId') connectionId: string,
    @OrganizationId() organizationId: string,
  ) {
    if (!connectionId) {
      throw new HttpException(
        'connectionId query parameter is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.cloudSecurityService.getRunStatus(
        runId,
        connectionId,
        organizationId,
      );
    } catch (error) {
      if (error instanceof ConnectionNotFoundError) {
        throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
      }
      const message =
        error instanceof Error ? error.message : 'Failed to get run status';
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('legacy/connect')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'create')
  async connectLegacy(
    @OrganizationId() organizationId: string,
    @Body()
    body: {
      provider: 'aws' | 'gcp' | 'azure';
      credentials: Record<string, string | string[]>;
    },
  ) {
    const result = await this.legacyService.connectLegacy(
      organizationId,
      body.provider,
      body.credentials,
    );
    return { success: true, integrationId: result.integrationId };
  }

  @Post('legacy/validate-aws')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'read')
  async validateAwsCredentials(
    @Body() body: { accessKeyId: string; secretAccessKey: string },
  ) {
    const result = await this.legacyService.validateAwsAccessKeys(
      body.accessKeyId,
      body.secretAccessKey,
    );
    return {
      success: true,
      accountId: result.accountId,
      regions: result.regions,
    };
  }

  @Delete('legacy/:integrationId')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'delete')
  async disconnectLegacy(
    @Param('integrationId') integrationId: string,
    @OrganizationId() organizationId: string,
  ) {
    await this.legacyService.disconnectLegacy(integrationId, organizationId);
    return { success: true };
  }
}
