import { Injectable, Logger } from '@nestjs/common';
import { db, Prisma } from '@db';
import { CredentialVaultService } from '../integration-platform/services/credential-vault.service';
import { AiRemediationService } from './ai-remediation.service';
import { AzureSecurityService } from './providers/azure-security.service';
import { parseAzurePermissionError } from './remediation-error.utils';
import {
  executeAzurePlanSteps,
  validateAzurePlanSteps,
} from './azure-command-executor';
import type { AzureFixPlan } from './azure-ai-remediation.prompt';

const PLAN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class AzureRemediationService {
  private readonly logger = new Logger(AzureRemediationService.name);
  private planCache = new Map<
    string,
    { plan: AzureFixPlan; timestamp: number }
  >();
  private readonly PLAN_CACHE_MAX = 100;

  private evictStalePlans() {
    if (this.planCache.size <= this.PLAN_CACHE_MAX) return;
    const now = Date.now();
    for (const [key, entry] of this.planCache) {
      if (now - entry.timestamp > PLAN_CACHE_TTL) this.planCache.delete(key);
    }
    while (this.planCache.size > this.PLAN_CACHE_MAX) {
      const firstKey = this.planCache.keys().next().value;
      if (firstKey) this.planCache.delete(firstKey);
      else break;
    }
  }

  constructor(
    private readonly credentialVaultService: CredentialVaultService,
    private readonly aiRemediationService: AiRemediationService,
    private readonly azureSecurityService: AzureSecurityService,
  ) {}

  async getCapabilities(params: {
    connectionId: string;
    organizationId: string;
  }) {
    const credentials = await this.resolveCredentials(
      params.connectionId,
      params.organizationId,
    );
    return {
      enabled: Boolean(credentials?.access_token || credentials?.clientId),
      aiPowered: true,
      remediations: [],
    };
  }

  async previewRemediation(params: {
    connectionId: string;
    organizationId: string;
    checkResultId: string;
    remediationKey: string;
  }) {
    const { finding, accessToken } = await this.resolveContext(
      params.connectionId,
      params.organizationId,
      params.checkResultId,
    );

    // Generate AI plan
    let plan = await this.aiRemediationService.generateAzureFixPlan(finding);

    if (!plan.canAutoFix) {
      return this.buildGuidedResponse(plan);
    }

    // Execute read steps to get real Azure state
    if (plan.readSteps.length > 0 && accessToken) {
      const readResult = await executeAzurePlanSteps({
        steps: plan.readSteps,
        accessToken,
      });

      const realState: Record<string, unknown> = {};
      for (const r of readResult.results) {
        if (r.success && r.response) {
          realState[r.step.purpose] = r.response;
        }
      }

      // Refine plan with real Azure state
      if (Object.keys(realState).length > 0) {
        plan = await this.aiRemediationService.refineAzureFixPlan({
          finding,
          originalPlan: plan,
          realAzureState: realState,
        });
      }
    }

    // Validate fix steps
    const validationErrors = validateAzurePlanSteps(plan.fixSteps);
    if (validationErrors.length > 0) {
      this.logger.warn(
        `Fix plan validation errors: ${validationErrors.join(', ')}`,
      );
      return this.buildGuidedResponse(plan);
    }

    // Cache plan for execute
    const cacheKey = `${params.connectionId}:${params.checkResultId}:${params.remediationKey}`;
    this.evictStalePlans();
    this.planCache.set(cacheKey, { plan, timestamp: Date.now() });

    return this.buildPreviewResponse(plan);
  }

  async executeRemediation(params: {
    connectionId: string;
    organizationId: string;
    checkResultId: string;
    remediationKey: string;
    userId: string;
    acknowledgment?: string;
  }) {
    const { finding, accessToken } = await this.resolveContext(
      params.connectionId,
      params.organizationId,
      params.checkResultId,
    );

    if (!accessToken) {
      throw new Error('Azure access token unavailable. Check credentials.');
    }

    // Retrieve or regenerate plan
    const cacheKey = `${params.connectionId}:${params.checkResultId}:${params.remediationKey}`;
    const cached = this.planCache.get(cacheKey);
    let plan: AzureFixPlan;

    if (cached && Date.now() - cached.timestamp < PLAN_CACHE_TTL) {
      plan = cached.plan;
    } else {
      plan = await this.aiRemediationService.generateAzureFixPlan(finding);
      if (!plan.canAutoFix) {
        throw new Error(
          'This finding cannot be auto-fixed. Use guided steps instead.',
        );
      }
    }

    // Create action record
    const action = await db.remediationAction.create({
      data: {
        connectionId: params.connectionId,
        organizationId: params.organizationId,
        checkResultId: params.checkResultId,
        remediationKey: params.remediationKey,
        resourceId: finding.resourceId || params.checkResultId,
        resourceType: finding.resourceType || 'azure-resource',
        previousState: {},
        appliedState: {},
        status: 'executing',
        riskLevel: plan.risk,
        acknowledgmentText: params.acknowledgment,
        acknowledgedAt: params.acknowledgment ? new Date() : null,
        initiatedById: params.userId,
      },
    });

    try {
      // Phase 1: Execute read steps to capture previous state
      const previousState: Record<string, unknown> = {};
      if (plan.readSteps.length > 0) {
        const readResult = await executeAzurePlanSteps({
          steps: plan.readSteps,
          accessToken,
        });
        for (const r of readResult.results) {
          if (r.success && r.response) {
            previousState[r.step.purpose] = r.response;
          }
        }
      }

      // Phase 2: Refine plan with real state
      if (Object.keys(previousState).length > 0) {
        plan = await this.aiRemediationService.refineAzureFixPlan({
          finding,
          originalPlan: plan,
          realAzureState: previousState,
        });
      }

      this.logger.log(
        `AI plan for ${finding.findingKey}: canAutoFix=${plan.canAutoFix}, ` +
          `fixSteps=${plan.fixSteps.length}, readSteps=${plan.readSteps.length}, ` +
          `rollbackSteps=${plan.rollbackSteps.length}`,
      );

      // If AI decided it can't auto-fix after seeing real state, fail clearly
      if (!plan.canAutoFix || plan.fixSteps.length === 0) {
        await db.remediationAction.update({
          where: { id: action.id },
          data: {
            status: 'failed',
            previousState: previousState as unknown as Prisma.InputJsonValue,
            appliedState: {
              error:
                plan.reason ||
                'Auto-fix not possible for this finding after analyzing real resource state.',
              guidedSteps: plan.guidedSteps,
            } as unknown as Prisma.InputJsonValue,
            executedAt: new Date(),
          },
        });

        return {
          actionId: action.id,
          status: 'failed' as const,
          resourceId: finding.resourceId,
          error:
            plan.reason ||
            'Auto-fix not possible. The required resources (e.g., Log Analytics workspace) may not exist in your subscription.',
          previousState,
          guidedSteps: plan.guidedSteps,
        };
      }

      // Phase 2.5: Pre-flight — check write permissions and self-heal before executing
      const subscriptionId = this.extractSubscriptionId(
        plan.fixSteps[0]?.url || finding.resourceId,
      );
      if (subscriptionId) {
        await this.ensureWriteAccess(accessToken, subscriptionId);
      }

      // Phase 3: Execute fix steps with self-healing retry
      // Executor auto-handles: provider registration, throttling, retries, provisioning waits
      for (const step of plan.fixSteps) {
        this.logger.log(
          `Fix step: ${step.method} ${step.url} — ${step.purpose}`,
        );
      }

      // Validate URLs before execution to prevent SSRF (especially after cache-miss regeneration)
      const validationErrors = validateAzurePlanSteps(plan.fixSteps);
      if (validationErrors.length > 0) {
        throw new Error(
          `Fix plan validation failed: ${validationErrors.join('; ')}`,
        );
      }

      let fixResult = await executeAzurePlanSteps({
        steps: plan.fixSteps,
        accessToken,
        autoRollbackSteps: plan.rollbackSteps,
      });

      // If permission error, report it clearly — don't attempt self-healing role grants
      if (fixResult.error) {
        const permError = parseAzurePermissionError(fixResult.error.message);
        if (permError?.isPermissionError) {
          this.logger.warn(
            `Permission error: ${fixResult.error.message}. Assign the required Azure role to the app registration.`,
          );
        }
      }

      // Self-healing round 2: non-permission error → regenerate plan with error context → retry
      if (
        fixResult.error &&
        !parseAzurePermissionError(fixResult.error.message)?.isPermissionError
      ) {
        this.logger.log(
          'Non-permission error — regenerating fix plan with error context...',
        );
        const retryPlan = await this.aiRemediationService.refineAzureFixPlan({
          finding,
          originalPlan: plan,
          realAzureState: {
            ...previousState,
            _lastError: fixResult.error.message,
            _failedStep: fixResult.error.step,
          },
        });

        if (retryPlan.canAutoFix && retryPlan.fixSteps.length > 0) {
          this.logger.log(
            `Retrying with regenerated plan (${retryPlan.fixSteps.length} steps)...`,
          );
          plan = retryPlan;
          fixResult = await executeAzurePlanSteps({
            steps: plan.fixSteps,
            accessToken,
            autoRollbackSteps: plan.rollbackSteps,
          });
        }
      }

      // Log every step result for audit trail
      for (const r of fixResult.results) {
        this.logger.log(
          `Step result: ${r.step.method} ${r.step.url} → ${r.success ? `${r.statusCode} OK` : `FAILED: ${r.error}`}`,
        );
      }

      // If still failing after self-healing attempts
      if (fixResult.error) {
        const permError = parseAzurePermissionError(fixResult.error.message);

        // Store ALL completed steps (even partial) so we can see what was modified
        await db.remediationAction.update({
          where: { id: action.id },
          data: {
            status: 'failed',
            previousState: previousState as unknown as Prisma.InputJsonValue,
            appliedState: {
              error: fixResult.error.message,
              stepIndex: fixResult.error.stepIndex,
              completedSteps: fixResult.results
                .filter((r) => r.success)
                .map((r) => ({
                  method: r.step.method,
                  url: r.step.url,
                  purpose: r.step.purpose,
                  statusCode: r.statusCode,
                })),
              failedStep: {
                method: fixResult.error.step.method,
                url: fixResult.error.step.url,
                purpose: fixResult.error.step.purpose,
                error: fixResult.error.message,
              },
              rollbackSteps: plan.rollbackSteps,
              ...(permError && {
                missingActions: permError.missingActions,
                fixScript: permError.fixScript,
              }),
            } as unknown as Prisma.InputJsonValue,
            executedAt: new Date(),
          },
        });

        return {
          actionId: action.id,
          status: 'failed' as const,
          resourceId: finding.resourceId,
          error: fixResult.error.message,
          previousState,
          ...(permError && {
            missingPermissions: permError.missingActions,
            permissionFixScript: permError.fixScript,
          }),
        };
      }

      // Phase 4: Verify — re-read the resource to confirm fix took effect
      let verified = false;
      if (plan.readSteps.length > 0) {
        // Wait briefly for Azure to propagate the change
        await new Promise((r) => setTimeout(r, 2000));

        const verifyResult = await executeAzurePlanSteps({
          steps: plan.readSteps,
          accessToken,
        });

        const postFixState: Record<string, unknown> = {};
        for (const r of verifyResult.results) {
          if (r.success && r.response) {
            postFixState[r.step.purpose] = r.response;
          }
        }

        // Compare: if post-fix state differs from pre-fix state, the fix changed something
        verified =
          JSON.stringify(postFixState) !== JSON.stringify(previousState);
      }

      const status = verified ? 'success' : 'unverified';
      await db.remediationAction.update({
        where: { id: action.id },
        data: {
          status,
          previousState: previousState as unknown as Prisma.InputJsonValue,
          appliedState: {
            steps: fixResult.results.map((r) => ({
              purpose: r.step.purpose,
              statusCode: r.statusCode,
              response: r.response,
            })),
            rollbackSteps: plan.rollbackSteps,
            verified,
          } as unknown as Prisma.InputJsonValue,
          executedAt: new Date(),
        },
      });

      this.planCache.delete(cacheKey);

      if (!verified) {
        this.logger.warn(
          `Fix for ${finding.findingKey} executed but verification shows no state change. ` +
            `The fix may need time to propagate or may not have addressed the finding correctly.`,
        );
      }

      return {
        actionId: action.id,
        status: status,
        resourceId: finding.resourceId,
        previousState,
        appliedState: { description: plan.description, verified },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await db.remediationAction.update({
        where: { id: action.id },
        data: {
          status: 'failed',
          appliedState: { error: msg } as unknown as Prisma.InputJsonValue,
          executedAt: new Date(),
        },
      });
      throw error;
    }
  }

  async rollbackRemediation(params: {
    actionId: string;
    organizationId: string;
  }) {
    const action = await db.remediationAction.findFirst({
      where: {
        id: params.actionId,
        organizationId: params.organizationId,
        status: { in: ['success', 'unverified'] },
      },
      include: {
        connection: { include: { provider: true } },
      },
    });

    if (!action) {
      throw new Error('Remediation action not found or cannot be rolled back.');
    }

    const appliedState = action.appliedState as Record<string, unknown> | null;
    const rollbackSteps = (appliedState?.rollbackSteps ?? []) as Array<
      Record<string, unknown>
    >;

    if (rollbackSteps.length === 0) {
      throw new Error('No rollback steps available for this action.');
    }

    // Get fresh access token
    const credentials = await this.resolveCredentials(
      action.connectionId,
      action.organizationId,
    );
    if (!credentials) {
      throw new Error('Cannot retrieve Azure credentials for rollback.');
    }

    // OAuth flow: token from vault; legacy: SP client credentials
    let accessToken = credentials.access_token as string | undefined;
    if (
      !accessToken &&
      credentials.tenantId &&
      credentials.clientId &&
      credentials.clientSecret
    ) {
      accessToken = await this.azureSecurityService.getAccessToken(
        credentials.tenantId as string,
        credentials.clientId as string,
        credentials.clientSecret as string,
      );
    }
    if (!accessToken) {
      throw new Error('Cannot obtain Azure access token for rollback.');
    }

    this.logger.log(
      `Rolling back action ${action.id}: ${rollbackSteps.length} steps`,
    );
    for (const step of rollbackSteps) {
      this.logger.log(
        `Rollback step: ${(step as { method?: string }).method} ${(step as { url?: string }).url} — ${(step as { purpose?: string }).purpose}`,
      );
    }

    // Pre-flight: ensure write access before rollback
    const subscriptionId = this.extractSubscriptionId(
      (rollbackSteps[0] as { url?: string })?.url || action.checkResultId,
    );
    if (subscriptionId) {
      await this.ensureWriteAccess(accessToken, subscriptionId);
    }

    const result = await executeAzurePlanSteps({
      steps: rollbackSteps as Parameters<
        typeof executeAzurePlanSteps
      >[0]['steps'],
      accessToken,
      isRollback: true,
    });

    // If permission error during rollback, log clearly
    if (result.error && subscriptionId) {
      const permError = parseAzurePermissionError(result.error.message);
      if (permError?.isPermissionError) {
        this.logger.warn(
          `Rollback permission error: ${result.error.message}. Assign the required Azure role to the app registration.`,
        );
      }
    }

    // Log each rollback step result
    for (const r of result.results) {
      this.logger.log(
        `Rollback result: ${r.step.method} ${r.step.url} → ${r.success ? `${r.statusCode} OK` : `FAILED: ${r.error}`}`,
      );
    }

    if (result.error) {
      const permError = parseAzurePermissionError(result.error.message);
      const completedCount = result.results.filter((r) => r.success).length;

      this.logger.error(
        `Rollback failed at step ${result.error.stepIndex}: ${result.error.message}. ` +
          `${completedCount}/${rollbackSteps.length} steps completed before failure.`,
      );

      await db.remediationAction.update({
        where: { id: action.id },
        data: {
          status: 'rollback_failed',
          rolledBackAt: new Date(),
          appliedState: {
            ...((action.appliedState as Record<string, unknown>) ?? {}),
            rollbackError: result.error.message,
            rollbackCompletedSteps: result.results
              .filter((r) => r.success)
              .map((r) => ({
                method: r.step.method,
                url: r.step.url,
                purpose: r.step.purpose,
              })),
            rollbackFailedStep: {
              method: result.error.step.method,
              url: result.error.step.url,
              purpose: result.error.step.purpose,
              error: result.error.message,
            },
          } as unknown as Prisma.InputJsonValue,
        },
      });

      return {
        status: 'rollback_failed' as const,
        connectionId: action.connectionId,
        remediationKey: action.remediationKey,
        resourceId: action.checkResultId,
        error: result.error.message,
        ...(permError && {
          missingPermissions: permError.missingActions,
          permissionFixScript: permError.fixScript,
        }),
      };
    }

    await db.remediationAction.update({
      where: { id: action.id },
      data: {
        status: 'rolled_back',
        rolledBackAt: new Date(),
      },
    });

    return {
      status: 'rolled_back' as const,
      connectionId: action.connectionId,
      remediationKey: action.remediationKey,
      resourceId: action.checkResultId,
    };
  }

  // --- Self-healing helpers ---

  /**
   * Pre-flight: check if the token has write access on the subscription.
   * If not, attempt to self-grant Contributor role.
   */
  private async ensureWriteAccess(
    accessToken: string,
    subscriptionId: string,
  ): Promise<void> {
    try {
      const resp = await fetch(
        `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/permissions?api-version=2022-04-01`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!resp.ok) {
        this.logger.warn('Could not check permissions — proceeding anyway');
        return;
      }

      const data = (await resp.json()) as {
        value: Array<{ actions: string[]; notActions: string[] }>;
      };
      const allActions = data.value?.flatMap((p) => p.actions) ?? [];
      const hasWrite = allActions.some(
        (a) => a === '*' || a === '*/write' || a.endsWith('/write'),
      );

      if (hasWrite) {
        this.logger.log('Pre-flight: write access confirmed');
        return;
      }

      this.logger.warn(
        'Pre-flight: no write access detected — fix may fail. Assign Contributor role to the app registration.',
      );
    } catch (err) {
      this.logger.warn(
        `Pre-flight permission check failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private extractSubscriptionId(resourceId: string): string | null {
    const match = resourceId.match(/\/subscriptions\/([^/]+)/);
    return match?.[1] ?? null;
  }

  // --- Private helpers ---

  private async resolveCredentials(
    connectionId: string,
    organizationId: string,
  ): Promise<Record<string, unknown> | null> {
    const connection = await db.integrationConnection.findFirst({
      where: { id: connectionId, organizationId, status: 'active' },
      include: { provider: true },
    });
    if (!connection || connection.provider.slug !== 'azure') return null;
    return this.credentialVaultService.getDecryptedCredentials(connectionId);
  }

  private async resolveContext(
    connectionId: string,
    organizationId: string,
    checkResultId: string,
  ) {
    const credentials = await this.resolveCredentials(
      connectionId,
      organizationId,
    );

    let accessToken: string | null = null;
    // OAuth flow: token from vault
    if (credentials?.access_token) {
      accessToken = credentials.access_token as string;
    }
    // Legacy SP flow fallback
    if (
      !accessToken &&
      credentials?.tenantId &&
      credentials?.clientId &&
      credentials?.clientSecret
    ) {
      accessToken = await this.azureSecurityService.getAccessToken(
        credentials.tenantId as string,
        credentials.clientId as string,
        credentials.clientSecret as string,
      );
    }

    const checkResult = await db.integrationCheckResult.findFirst({
      where: {
        id: checkResultId,
        checkRun: { connectionId },
      },
    });

    if (!checkResult) {
      throw new Error(`Check result ${checkResultId} not found`);
    }

    const evidence = (checkResult.evidence ?? {}) as Record<string, unknown>;

    return {
      finding: {
        title: checkResult.title ?? '',
        description: checkResult.description,
        severity: checkResult.severity,
        resourceType: checkResult.resourceType ?? 'azure-resource',
        resourceId: checkResult.resourceId ?? '',
        remediation: checkResult.remediation,
        findingKey: (evidence.findingKey as string) ?? '',
        evidence,
      },
      accessToken,
    };
  }

  private buildPreviewResponse(plan: AzureFixPlan) {
    return {
      currentState: plan.currentState,
      proposedState: plan.proposedState,
      description: plan.description,
      risk: plan.risk,
      apiCalls: plan.fixSteps.map((s) => ({
        method: s.method,
        endpoint: s.url,
        purpose: s.purpose,
      })),
      guidedOnly: false,
      rollbackSupported: plan.rollbackSupported,
      requiresAcknowledgment: plan.requiresAcknowledgment
        ? ('checkbox' as const)
        : undefined,
      acknowledgmentMessage: plan.acknowledgmentMessage,
    };
  }

  private buildGuidedResponse(plan: AzureFixPlan) {
    return {
      currentState: plan.currentState,
      proposedState: plan.proposedState,
      description: plan.description,
      risk: plan.risk,
      apiCalls: [],
      guidedOnly: true,
      guidedSteps: plan.guidedSteps ?? [
        plan.reason || 'This finding requires manual remediation.',
      ],
      rollbackSupported: false,
      requiresAcknowledgment: undefined,
    };
  }
}
