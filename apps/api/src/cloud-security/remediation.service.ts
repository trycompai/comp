import { Injectable, Logger } from '@nestjs/common';
import { db, Prisma } from '@db';
import { CredentialVaultService } from '../integration-platform/services/credential-vault.service';
import { parseAwsPermissionError } from './remediation-error.utils';
import { AWSSecurityService } from './providers/aws-security.service';
import { AiRemediationService } from './ai-remediation.service';
import { GcpRemediationService } from './gcp-remediation.service';
import { AzureRemediationService } from './azure-remediation.service';
import {
  executeAwsCommand,
  executePlanSteps,
  validatePlanSteps,
} from './aws-command-executor';
import type { FixPlan, AwsCommandStep } from './ai-remediation.prompt';

@Injectable()
export class RemediationService {
  private readonly logger = new Logger(RemediationService.name);
  /** Cache fix plans between preview and execute to avoid double AI calls. */
  private readonly planCache = new Map<
    string,
    { plan: FixPlan; timestamp: number; permissionsList?: string[] }
  >();
  private readonly PLAN_CACHE_MAX = 100;
  private readonly PLAN_CACHE_TTL = 5 * 60 * 1000;

  private evictStalePlans() {
    if (this.planCache.size <= this.PLAN_CACHE_MAX) return;
    const now = Date.now();
    for (const [key, entry] of this.planCache) {
      if (now - entry.timestamp > this.PLAN_CACHE_TTL)
        this.planCache.delete(key);
    }
    // If still over limit, delete oldest
    while (this.planCache.size > this.PLAN_CACHE_MAX) {
      const firstKey = this.planCache.keys().next().value;
      if (firstKey) this.planCache.delete(firstKey);
      else break;
    }
  }

  constructor(
    private readonly credentialVaultService: CredentialVaultService,
    private readonly awsSecurityService: AWSSecurityService,
    private readonly aiRemediationService: AiRemediationService,
    private readonly gcpRemediationService: GcpRemediationService,
    private readonly azureRemediationService: AzureRemediationService,
  ) {}

  async getCapabilities(params: {
    connectionId: string;
    organizationId: string;
  }) {
    const connection = await this.getConnection(params);

    if (connection.provider.slug === 'gcp') {
      return this.gcpRemediationService.getCapabilities(params);
    }

    if (connection.provider.slug === 'azure') {
      return this.azureRemediationService.getCapabilities(params);
    }

    if (connection.provider.slug !== 'aws') {
      return { enabled: false, remediations: [] };
    }

    const credentials =
      await this.credentialVaultService.getDecryptedCredentials(
        params.connectionId,
      );

    return {
      enabled: Boolean(credentials?.remediationRoleArn),
      aiPowered: true,
      remediations: [],
    };
  }

  async previewRemediation(params: {
    connectionId: string;
    organizationId: string;
    checkResultId: string;
    remediationKey: string;
    cachedPermissions?: string[];
  }) {
    // Delegate GCP/Azure to dedicated services
    const connection = await this.getConnection(params);
    if (connection.provider.slug === 'gcp') {
      return this.gcpRemediationService.previewRemediation(params);
    }
    if (connection.provider.slug === 'azure') {
      return this.azureRemediationService.previewRemediation(params);
    }

    const { finding, credentials, region } = await this.resolveContext(params);

    const evidence = (finding.evidence ?? {}) as Record<string, unknown>;
    const findingKey = evidence.findingKey as string;

    // RECHECK MODE: if frontend sends cachedPermissions, skip AI entirely
    // Just re-read the role and compare against the SAME list
    if (params.cachedPermissions && params.cachedPermissions.length > 0) {
      this.logger.log(
        `Recheck mode: checking ${params.cachedPermissions.length} cached permissions: ${params.cachedPermissions.slice(0, 5).join(', ')}...`,
      );
      const remediationCreds =
        await this.awsSecurityService.assumeRemediationRole(
          credentials,
          region,
        );
      let missingPermissions: string[] | undefined;
      let permissionFixScript: string | undefined;
      try {
        const existingActions = await this.getExistingRolePermissions(
          remediationCreds,
          region,
        );
        this.logger.log(`Role has ${existingActions.size} actions`);
        const missing = params.cachedPermissions.filter(
          (p) => !this.isPermissionCovered(p, existingActions),
        );
        if (missing.length > 0) {
          missingPermissions = missing;
          // Always include ALL cached permissions in script — not just missing ones
          // This prevents overwrite issues with IAM eventual consistency
          permissionFixScript = this.buildStaticPermissionScript(
            params.cachedPermissions,
          );
        }
      } catch (err) {
        this.logger.warn(
          `Cannot read role policies on recheck: ${err instanceof Error ? err.message : String(err)}`,
        );
        missingPermissions = params.cachedPermissions;
      }

      // Return cached plan data with updated permission status
      const cached = this.planCache.get(
        `${params.connectionId}:${params.checkResultId}:${params.remediationKey}`,
      );
      const cachedPlan = cached?.plan;

      return {
        currentState: cachedPlan?.currentState ?? {},
        proposedState: cachedPlan?.proposedState ?? {},
        description: cachedPlan?.description ?? 'Recheck permissions',
        risk: cachedPlan?.risk ?? 'medium',
        apiCalls: cachedPlan?.requiredPermissions ?? params.cachedPermissions,
        guidedOnly: false,
        rollbackSupported: cachedPlan?.rollbackSupported ?? true,
        requiresAcknowledgment: 'checkbox' as const,
        acknowledgmentMessage:
          'This fix will modify your AWS infrastructure. Please review the changes above before proceeding.',
        allRequiredPermissions: params.cachedPermissions,
        ...(missingPermissions &&
          missingPermissions.length > 0 && {
            missingPermissions,
            permissionFixScript,
          }),
      };
    }

    const plan = await this.aiRemediationService.generateFixPlan({
      title: finding.title ?? 'Unknown',
      description: finding.description,
      severity: finding.severity,
      resourceType: finding.resourceType,
      resourceId: finding.resourceId,
      remediation: finding.remediation,
      findingKey,
      evidence,
    });

    if (!plan.canAutoFix) {
      return {
        currentState: plan.currentState,
        proposedState: {},
        description: plan.description,
        risk: plan.risk,
        apiCalls: [],
        guidedOnly: true,
        guidedSteps: plan.guidedSteps ?? [plan.reason ?? plan.description],
        rollbackSupported: false,
        requiresAcknowledgment: undefined,
      };
    }

    // If plan has read steps, execute them now to get REAL state and refine the plan
    if (plan.readSteps.length > 0) {
      const readErrors = validatePlanSteps(plan.readSteps);
      if (readErrors.length === 0) {
        try {
          const remediationCreds =
            await this.awsSecurityService.assumeRemediationRole(
              credentials,
              region,
            );
          const readResult = await executePlanSteps({
            steps: plan.readSteps,
            credentials: remediationCreds,
            region,
          });
          const realState = readResult.results.reduce(
            (acc, r) => ({ ...acc, [r.step.purpose]: r.output }),
            {} as Record<string, unknown>,
          );

          // Refine plan with real data
          const refined = await this.aiRemediationService.refineFixPlan({
            finding: {
              title: finding.title ?? 'Unknown',
              description: finding.description,
              severity: finding.severity,
              resourceType: finding.resourceType,
              resourceId: finding.resourceId,
              remediation: finding.remediation,
              findingKey,
              evidence,
            },
            originalPlan: plan,
            realAwsState: realState,
          });

          // If AI now says it can't auto-fix, show guided steps
          if (!refined.canAutoFix) {
            return {
              currentState: refined.currentState,
              proposedState: {},
              description: refined.description,
              risk: refined.risk,
              apiCalls: [],
              guidedOnly: true,
              guidedSteps: refined.guidedSteps ?? [
                refined.reason ?? refined.description,
              ],
              rollbackSupported: false,
              requiresAcknowledgment: undefined,
            };
          }

          // Build the COMPLETE permission list from ALL sources
          const aiPermissions =
            await this.aiRemediationService.analyzeRequiredPermissions(refined);

          // Merge: AI analysis + refined plan's requiredPermissions + derived from commands
          const allPerms = new Set([
            ...aiPermissions,
            ...refined.requiredPermissions,
          ]);

          // Also derive from actual step commands
          const svcMap: Record<string, string> = {
            s3: 's3',
            logs: 'logs',
            'cloudwatch-logs': 'logs',
            cloudtrail: 'cloudtrail',
            cloudwatch: 'cloudwatch',
            iam: 'iam',
            sns: 'sns',
            ec2: 'ec2',
            rds: 'rds',
            kms: 'kms',
            'config-service': 'config',
            guardduty: 'guardduty',
            lambda: 'lambda',
            dynamodb: 'dynamodb',
            cloudfront: 'cloudfront',
          };
          for (const step of [...refined.readSteps, ...refined.fixSteps]) {
            const iamSvc = svcMap[step.service] ?? step.service;
            // Resolve the REAL command name from the SDK (handles AI fuzzy names)
            const realAction = this.resolveRealActionName(
              step.service,
              step.command,
            );
            allPerms.add(`${iamSvc}:${realAction}`);
          }
          // Always add iam:PassRole if any role is being used
          const allStepStr = JSON.stringify([...refined.fixSteps]);
          if (allStepStr.includes('Role') || allStepStr.includes('role')) {
            allPerms.add('iam:PassRole');
          }

          // Filter out dangerous + unnecessary
          const dangerousActions = /Delete|Remove|Terminate|Deregister/i;
          const permissionsList = [...allPerms]
            .filter((p) => !dangerousActions.test(p.split(':')[1] ?? ''))
            .filter(
              (p) => p !== 'sts:GetCallerIdentity' && p !== 'sts:AssumeRole',
            )
            .sort();
          // Check permissions by reading the ACTUAL policies on CompAI-Remediator
          let missingPermissions: string[] | undefined;
          let permissionFixScript: string | undefined;
          try {
            const existingActions = await this.getExistingRolePermissions(
              remediationCreds,
              region,
            );
            this.logger.log(
              `CompAI-Remediator has ${existingActions.size} actions. Needed: ${permissionsList.length}`,
            );
            const missing = permissionsList.filter(
              (p) => !this.isPermissionCovered(p, existingActions),
            );
            if (missing.length > 0) {
              this.logger.log(
                `Missing ${missing.length} permissions: ${missing.join(', ')}`,
              );
              missingPermissions = missing;
              permissionFixScript =
                this.buildStaticPermissionScript(permissionsList);
            }
          } catch (err) {
            this.logger.warn(
              `Cannot read role policies: ${err instanceof Error ? err.message : String(err)}`,
            );
            missingPermissions = permissionsList;
            permissionFixScript =
              this.buildStaticPermissionScript(permissionsList);
          }

          // Cache the refined plan + permissions for execute and Recheck
          this.evictStalePlans();
          this.planCache.set(
            `${params.connectionId}:${params.checkResultId}:${params.remediationKey}`,
            { plan: refined, timestamp: Date.now(), permissionsList },
          );

          return {
            currentState: refined.currentState,
            proposedState: refined.proposedState,
            description: refined.description,
            risk: refined.risk,
            apiCalls: refined.requiredPermissions,
            guidedOnly: false,
            rollbackSupported: refined.rollbackSupported,
            requiresAcknowledgment: 'checkbox' as const,
            acknowledgmentMessage:
              'This fix will modify your AWS infrastructure. Please review the changes above before proceeding.',
            allRequiredPermissions: permissionsList,
            ...(missingPermissions &&
              missingPermissions.length > 0 && {
                missingPermissions,
                permissionFixScript,
              }),
          };
        } catch {
          // If read fails, fall through to show the AI's initial plan
        }
      }
    }

    // Fallback: show initial AI plan without real data
    this.evictStalePlans();
    this.planCache.set(
      `${params.connectionId}:${params.checkResultId}:${params.remediationKey}`,
      {
        plan,
        timestamp: Date.now(),
        permissionsList: plan.requiredPermissions,
      },
    );

    return {
      currentState: plan.currentState,
      proposedState: plan.proposedState,
      description: plan.description,
      risk: plan.risk,
      apiCalls: plan.requiredPermissions,
      guidedOnly: false,
      rollbackSupported: plan.rollbackSupported,
      requiresAcknowledgment: 'checkbox' as const,
      acknowledgmentMessage:
        'This fix will modify your AWS infrastructure. Please review the changes above before proceeding.',
    };
  }

  async executeRemediation(params: {
    connectionId: string;
    organizationId: string;
    checkResultId: string;
    remediationKey: string;
    userId: string;
    acknowledgment?: string;
  }) {
    // Delegate GCP/Azure to dedicated services
    const connection = await this.getConnection(params);
    if (connection.provider.slug === 'gcp') {
      return this.gcpRemediationService.executeRemediation(params);
    }
    if (connection.provider.slug === 'azure') {
      return this.azureRemediationService.executeRemediation(params);
    }

    const { finding, credentials, region } = await this.resolveContext(params);

    // Get plan from cache or regenerate
    let plan: FixPlan;
    const cached = this.planCache.get(
      `${params.connectionId}:${params.checkResultId}:${params.remediationKey}`,
    );
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      plan = cached.plan;
    } else {
      const evidence = (finding.evidence ?? {}) as Record<string, unknown>;
      plan = await this.aiRemediationService.generateFixPlan({
        title: finding.title ?? 'Unknown',
        description: finding.description,
        severity: finding.severity,
        resourceType: finding.resourceType,
        resourceId: finding.resourceId,
        remediation: finding.remediation,
        findingKey: evidence.findingKey as string,
        evidence,
      });
    }

    if (!plan.canAutoFix) {
      throw new Error(
        'This finding requires manual remediation and cannot be auto-fixed.',
      );
    }

    // Universal plan validation — reject plans that would leave infra in a bad state
    if (!plan.fixSteps || plan.fixSteps.length === 0) {
      throw new Error('AI generated an empty fix plan. Cannot proceed.');
    }
    if (!plan.rollbackSteps || plan.rollbackSteps.length === 0) {
      this.logger.warn(
        `No rollback steps for ${params.remediationKey} — fix is irreversible`,
      );
    }

    // Always require acknowledgment — we're modifying cloud infrastructure
    if (!params.acknowledgment || params.acknowledgment !== 'acknowledged') {
      throw new Error(
        'Acknowledgment is required before executing any remediation.',
      );
    }

    // Create the action record
    const action = await db.remediationAction.create({
      data: {
        checkResultId: params.checkResultId,
        connectionId: params.connectionId,
        organizationId: params.organizationId,
        initiatedById: params.userId,
        remediationKey: params.remediationKey,
        resourceId: finding.resourceId,
        resourceType: finding.resourceType,
        previousState: {},
        appliedState: {},
        status: 'executing',
        riskLevel: plan.risk,
        acknowledgmentText: params.acknowledgment ?? null,
        acknowledgedAt: params.acknowledgment ? new Date() : null,
      },
    });

    try {
      // Validate read steps first
      const readErrors = validatePlanSteps(plan.readSteps);
      if (readErrors.length > 0) {
        throw new Error(`Invalid read steps: ${readErrors.join('; ')}`);
      }

      const remediationCreds =
        await this.awsSecurityService.assumeRemediationRole(
          credentials,
          region,
        );

      // Phase 1: Execute read steps to get REAL AWS state
      const readResult = await executePlanSteps({
        steps: plan.readSteps,
        credentials: remediationCreds,
        region,
      });
      const previousState = readResult.results.reduce(
        (acc, r) => ({ ...acc, [r.step.purpose]: r.output }),
        {} as Record<string, unknown>,
      );

      // Phase 2: Send real AWS state back to AI to generate EXACT fix steps
      const evidence = (finding.evidence ?? {}) as Record<string, unknown>;
      const refinedPlan = await this.aiRemediationService.refineFixPlan({
        finding: {
          title: finding.title ?? 'Unknown',
          description: finding.description,
          severity: finding.severity,
          resourceType: finding.resourceType,
          resourceId: finding.resourceId,
          remediation: finding.remediation,
          findingKey: evidence.findingKey as string,
          evidence,
        },
        originalPlan: plan,
        realAwsState: previousState,
      });

      if (!refinedPlan.canAutoFix) {
        // AI found the fix can't be automated after seeing real state — return as failed with guidance
        await db.remediationAction.update({
          where: { id: action.id },
          data: {
            status: 'failed',
            errorMessage: refinedPlan.reason ?? 'Cannot be auto-fixed.',
          },
        });
        return {
          actionId: action.id,
          status: 'failed' as const,
          resourceId: finding.resourceId,
          error:
            refinedPlan.reason ??
            'This finding requires manual setup before auto-fix is possible.',
          guidedSteps: refinedPlan.guidedSteps,
        };
      }

      // Validate refined fix steps
      if (!refinedPlan.fixSteps || refinedPlan.fixSteps.length === 0) {
        throw new Error('AI refined plan has no fix steps. Cannot proceed.');
      }
      const fixErrors = validatePlanSteps(refinedPlan.fixSteps);
      if (fixErrors.length > 0) {
        throw new Error(`Invalid fix steps: ${fixErrors.join('; ')}`);
      }

      // Phase 3: Execute the refined fix steps (now with REAL values)
      // Pass rollback steps for automatic undo on partial failure
      const fixResult = await executePlanSteps({
        steps: refinedPlan.fixSteps,
        credentials: remediationCreds,
        region,
        autoRollbackSteps: refinedPlan.rollbackSteps,
      });

      if (fixResult.error) {
        this.logger.error(
          `Fix step ${fixResult.error.stepIndex + 1} failed: ${fixResult.error.step.service}:${fixResult.error.step.command} — ${fixResult.error.message}`,
        );
        this.logger.error(
          `Step params: ${JSON.stringify(fixResult.error.step.params).slice(0, 500)}`,
        );
        throw new Error(fixResult.error.message);
      }

      const appliedState = {
        steps: fixResult.results.map((r) => ({
          command: `${r.step.service}:${r.step.command}`,
          output: r.output,
        })),
        rollbackSteps: refinedPlan.rollbackSteps,
      };

      await db.remediationAction.update({
        where: { id: action.id },
        data: {
          status: 'success',
          previousState: previousState as Prisma.InputJsonValue,
          appliedState: appliedState as Prisma.InputJsonValue,
          executedAt: new Date(),
        },
      });

      this.logger.log(`Remediation executed on ${finding.resourceId}`);
      this.planCache.delete(
        `${params.connectionId}:${params.checkResultId}:${params.remediationKey}`,
      );

      return {
        actionId: action.id,
        status: 'success' as const,
        resourceId: finding.resourceId,
        previousState,
        appliedState,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const permissionInfo = parseAwsPermissionError(errorMessage);

      // If permission error, build script with ALL needed permissions (not just the one that failed)
      // This prevents overwriting CompAI-AutoFix with a partial list
      let permissionError:
        | { missingActions: string[]; fixScript?: string }
        | undefined;
      if (permissionInfo.isPermissionError && plan.fixSteps.length > 0) {
        try {
          const suggestion =
            await this.aiRemediationService.suggestPermissionFix({
              errorMessage,
              failedStep: plan.fixSteps[0],
            });
          // Merge: cached permissions from preview + newly discovered missing ones
          const cached = this.planCache.get(
            `${params.connectionId}:${params.checkResultId}:${params.remediationKey}`,
          );
          const allPerms = new Set([
            ...(cached?.permissionsList ?? plan.requiredPermissions),
            ...suggestion.missingActions,
          ]);
          const mergedScript = this.buildStaticPermissionScript([...allPerms]);
          permissionError = {
            missingActions: suggestion.missingActions,
            fixScript: mergedScript,
          };
        } catch {
          permissionError = { missingActions: permissionInfo.missingActions };
        }
      }

      await db.remediationAction.update({
        where: { id: action.id },
        data: { status: 'failed', errorMessage },
      });

      this.logger.error(`Remediation failed: ${errorMessage}`);

      return {
        actionId: action.id,
        status: 'failed' as const,
        resourceId: finding.resourceId,
        error: errorMessage,
        ...(permissionError && { permissionError }),
      };
    }
  }

  async rollbackRemediation(params: {
    actionId: string;
    organizationId: string;
  }) {
    // Check provider to delegate GCP rollback
    const actionWithProvider = await db.remediationAction.findFirst({
      where: { id: params.actionId, organizationId: params.organizationId },
      include: { connection: { include: { provider: true } } },
    });

    if (!actionWithProvider) throw new Error('Remediation action not found');

    if (actionWithProvider.connection?.provider?.slug === 'gcp') {
      return this.gcpRemediationService.rollbackRemediation(params);
    }
    if (actionWithProvider.connection?.provider?.slug === 'azure') {
      return this.azureRemediationService.rollbackRemediation(params);
    }

    const action = actionWithProvider;
    if (action.status !== 'success' && action.status !== 'unverified') {
      throw new Error(`Cannot rollback action with status "${action.status}"`);
    }

    const appliedState = action.appliedState as Record<string, unknown>;
    const rollbackSteps = (appliedState.rollbackSteps ??
      []) as AwsCommandStep[];

    if (rollbackSteps.length === 0) {
      throw new Error('No rollback steps available for this action');
    }

    const credentials =
      await this.credentialVaultService.getDecryptedCredentials(
        action.connectionId,
      );
    if (!credentials) throw new Error('No credentials found');

    const region = this.getRegion(credentials);
    const remediationCreds =
      await this.awsSecurityService.assumeRemediationRole(credentials, region);

    try {
      const result = await executePlanSteps({
        steps: rollbackSteps,
        credentials: remediationCreds,
        region,
        isRollback: true,
      });

      if (result.error) throw new Error(result.error.message);

      await db.remediationAction.update({
        where: { id: action.id },
        data: { status: 'rolled_back', rolledBackAt: new Date() },
      });

      this.logger.log(
        `Rolled back ${action.remediationKey} on ${action.resourceId}`,
      );

      return {
        status: 'rolled_back' as const,
        connectionId: action.connectionId,
        remediationKey: action.remediationKey,
        resourceId: action.resourceId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const permissionInfo = parseAwsPermissionError(errorMessage);

      await db.remediationAction.update({
        where: { id: action.id },
        data: {
          status: 'rollback_failed',
          errorMessage: `Rollback failed: ${errorMessage}`,
        },
      });

      // If permission error, include actionable info
      if (permissionInfo.isPermissionError) {
        const missingActions =
          permissionInfo.missingActions.length > 0
            ? permissionInfo.missingActions
            : ['(could not determine specific action)'];
        const script = this.buildStaticPermissionScript(missingActions);
        throw new Error(
          JSON.stringify({
            message: `Rollback failed: missing permissions`,
            missingActions,
            script,
          }),
        );
      }

      throw new Error(`Rollback failed: ${errorMessage}`);
    }
  }

  async getActions(params: { connectionId: string; organizationId: string }) {
    const actions = await db.remediationAction.findMany({
      where: {
        connectionId: params.connectionId,
        organizationId: params.organizationId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const userIds = [...new Set(actions.map((a) => a.initiatedById))].filter(
      (id) => id !== 'system',
    );
    const users = userIds.length
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.name]));
    userMap.set('system', 'System');

    return actions.map((a) => ({
      ...a,
      initiatedByName: userMap.get(a.initiatedById) ?? null,
    }));
  }

  // ─── Private helpers ──────────────────────────────────────────────────

  private async getConnection(params: {
    connectionId: string;
    organizationId: string;
  }) {
    const connection = await db.integrationConnection.findFirst({
      where: {
        id: params.connectionId,
        organizationId: params.organizationId,
        status: 'active',
      },
      include: { provider: true },
    });
    if (!connection) throw new Error('Connection not found or inactive');
    return connection;
  }

  private async resolveContext(params: {
    connectionId: string;
    organizationId: string;
    checkResultId: string;
    remediationKey: string;
  }) {
    const connection = await this.getConnection(params);
    if (connection.provider.slug !== 'aws') {
      throw new Error('Remediation is only supported for AWS');
    }

    const finding = await db.integrationCheckResult.findFirst({
      where: {
        id: params.checkResultId,
        checkRun: { connectionId: params.connectionId },
      },
    });
    if (!finding) throw new Error('Finding not found');

    const credentials =
      await this.credentialVaultService.getDecryptedCredentials(
        params.connectionId,
      );
    if (!credentials) throw new Error('No credentials found');

    // Extract region from finding evidence or resourceId (not just first configured region)
    const region = this.getRegionForFinding(finding, credentials);
    return { finding, credentials, region };
  }

  /**
   * Determine the correct AWS region for a finding.
   * Priority: evidence.region > ARN region > first configured region > us-east-1
   */
  private getRegionForFinding(
    finding: { resourceId: string | null; evidence: unknown },
    credentials: Record<string, unknown>,
  ): string {
    // 1. Check evidence for explicit region
    const evidence = (finding.evidence ?? {}) as Record<string, unknown>;
    if (typeof evidence.region === 'string' && evidence.region) {
      return evidence.region;
    }

    // 2. Extract region from ARN (arn:aws:service:REGION:account:resource)
    const resourceId = finding.resourceId ?? '';
    const arnMatch = resourceId.match(/^arn:aws[^:]*:[^:]+:([a-z0-9-]+):/);
    if (arnMatch?.[1] && arnMatch[1] !== '*') {
      return arnMatch[1];
    }

    // 3. Fall back to first configured region
    return this.getRegion(credentials);
  }

  /**
   * Resolve AI-generated command name to the REAL SDK command name,
   * then derive the correct IAM action.
   * e.g., "PutBucketPublicAccessBlockCommand" → finds "PutPublicAccessBlockCommand" → returns "PutPublicAccessBlock"
   */
  private resolveRealActionName(service: string, command: string): string {
    // Import the SDK module statically (same as executor)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(`@aws-sdk/client-${service}`) as Record<
        string,
        unknown
      >;

      // Exact match
      if (mod[command] && typeof mod[command] === 'function') {
        return command.replace('Command', '');
      }

      // Fuzzy match — find closest command in the module
      const cmdBase = command.replace('Command', '');
      const match = Object.keys(mod).find((k) => {
        if (!k.endsWith('Command') || typeof mod[k] !== 'function')
          return false;
        const kBase = k.replace('Command', '');
        return (
          kBase.includes(cmdBase) ||
          cmdBase.includes(kBase) ||
          kBase.replace('Bucket', '') === cmdBase.replace('Bucket', '')
        );
      });

      if (match) {
        return match.replace('Command', '');
      }
    } catch {
      // Module not found — fall back to raw name
    }

    return command.replace('Command', '');
  }

  /**
   * Build a permission script. Always includes ALL provided permissions.
   * No IAM reads, no merging — avoids eventual consistency issues.
   */
  private buildStaticPermissionScript(permissions: string[]): string {
    const sorted = [...new Set(permissions)].sort();
    return [
      'aws iam put-role-policy',
      '  --role-name CompAI-Remediator',
      '  --policy-name CompAI-AutoFix',
      `  --policy-document '${JSON.stringify({ Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: sorted, Resource: '*' }] })}'`,
    ].join(' \\\n');
  }

  private getRegion(credentials: Record<string, unknown>): string {
    if (Array.isArray(credentials.regions) && credentials.regions.length > 0) {
      return credentials.regions[0] as string;
    }
    return 'us-east-1';
  }

  /**
   * Read the ACTUAL IAM policies attached to CompAI-Remediator and return
   * a Set of all allowed actions. This is deterministic — no simulation.
   */
  private async getExistingRolePermissions(
    credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    },
    region: string,
  ): Promise<Set<string>> {
    const { IAMClient, ListRolePoliciesCommand, GetRolePolicyCommand } =
      await import('@aws-sdk/client-iam');
    const iam = new IAMClient({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    const actions = new Set<string>();
    const roleName = 'CompAI-Remediator';

    try {
      // List all inline policies
      const listResp = await iam.send(
        new ListRolePoliciesCommand({ RoleName: roleName }),
      );
      const policyNames = listResp.PolicyNames ?? [];
      this.logger.log(
        `Role ${roleName} has ${policyNames.length} inline policies: ${policyNames.join(', ')}`,
      );

      // Read each policy and extract actions
      for (const policyName of policyNames) {
        try {
          const policyResp = await iam.send(
            new GetRolePolicyCommand({
              RoleName: roleName,
              PolicyName: policyName,
            }),
          );
          const doc = JSON.parse(
            decodeURIComponent(policyResp.PolicyDocument ?? '{}'),
          );
          this.logger.log(
            `Policy ${policyName}: ${JSON.stringify(doc).slice(0, 200)}`,
          );
          const statements = Array.isArray(doc.Statement) ? doc.Statement : [];
          for (const stmt of statements) {
            if (stmt.Effect !== 'Allow') continue;
            const stmtActions = Array.isArray(stmt.Action)
              ? stmt.Action
              : [stmt.Action];
            for (const action of stmtActions) {
              if (typeof action === 'string') {
                if (action === '*') {
                  actions.add('*');
                } else if (action.includes('*')) {
                  // Wildcard like "s3:*" or "cloudtrail:*"
                  actions.add(action);
                } else {
                  actions.add(action);
                }
              }
            }
          }
        } catch (policyErr) {
          this.logger.warn(
            `Failed to read policy ${policyName}: ${policyErr instanceof Error ? policyErr.message : String(policyErr)}`,
          );
        }
      }
      this.logger.log(
        `Total actions found on role: ${actions.size}. Sample: ${[...actions].slice(0, 10).join(', ')}`,
      );
    } finally {
      iam.destroy?.();
    }

    return actions;
  }

  /**
   * Check if a required permission is covered by the existing policy.
   * Handles wildcards and common AI naming mistakes.
   */
  private isPermissionCovered(
    required: string,
    existing: Set<string>,
  ): boolean {
    if (existing.has('*')) return true;
    if (existing.has(required)) return true;
    // Check service wildcards: "s3:*" covers "s3:CreateBucket"
    const [svc] = required.split(':');
    if (svc && existing.has(`${svc}:*`)) return true;
    // AI sometimes adds "Bucket" in action names: s3:PutBucketPublicAccessBlock vs s3:PutPublicAccessBlock
    const withoutBucket = required
      .replace(':PutBucket', ':Put')
      .replace(':GetBucket', ':Get')
      .replace(':DeleteBucket', ':Delete');
    if (withoutBucket !== required && existing.has(withoutBucket)) return true;
    const withBucket = required
      .replace(':Put', ':PutBucket')
      .replace(':Get', ':GetBucket')
      .replace(':Delete', ':DeleteBucket');
    if (withBucket !== required && existing.has(withBucket)) return true;
    return false;
  }
}
