import { Injectable, Logger } from '@nestjs/common';
import { db, Prisma } from '@db';
import { getManifest } from '@trycompai/integration-platform';
import { CredentialVaultService } from '../integration-platform/services/credential-vault.service';
import { OAuthCredentialsService } from '../integration-platform/services/oauth-credentials.service';
import { AiRemediationService } from './ai-remediation.service';
import { parseGcpPermissionError } from './remediation-error.utils';
import {
  executeGcpPlanSteps,
  validateGcpPlanSteps,
} from './gcp-command-executor';
import type { GcpFixPlan, GcpApiStep } from './gcp-ai-remediation.prompt';

@Injectable()
export class GcpRemediationService {
  private readonly logger = new Logger(GcpRemediationService.name);
  private readonly planCache = new Map<
    string,
    { plan: GcpFixPlan; timestamp: number }
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
    while (this.planCache.size > this.PLAN_CACHE_MAX) {
      const firstKey = this.planCache.keys().next().value;
      if (firstKey) this.planCache.delete(firstKey);
      else break;
    }
  }

  constructor(
    private readonly credentialVaultService: CredentialVaultService,
    private readonly oauthCredentialsService: OAuthCredentialsService,
    private readonly aiRemediationService: AiRemediationService,
  ) {}

  async getCapabilities(params: {
    connectionId: string;
    organizationId: string;
  }) {
    const credentials =
      await this.credentialVaultService.getDecryptedCredentials(
        params.connectionId,
      );

    return {
      enabled: Boolean(credentials?.access_token),
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
    const { finding, accessToken } = await this.resolveContext(params);
    const evidence = (finding.evidence ?? {}) as Record<string, unknown>;
    const findingKey = evidence.findingKey as string;

    const plan = await this.aiRemediationService.generateGcpFixPlan({
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

    // Execute read steps to get real GCP state
    if (plan.readSteps.length > 0) {
      const readErrors = validateGcpPlanSteps(plan.readSteps);
      if (readErrors.length === 0) {
        try {
          const readResult = await executeGcpPlanSteps({
            steps: plan.readSteps,
            accessToken,
          });
          const realState = readResult.results.reduce(
            (acc, r) => ({ ...acc, [r.step.purpose]: r.output }),
            {} as Record<string, unknown>,
          );

          const refined = await this.aiRemediationService.refineGcpFixPlan({
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
            realGcpState: realState,
          });

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

          this.evictStalePlans();
          this.planCache.set(
            `${params.connectionId}:${params.checkResultId}:${params.remediationKey}`,
            {
              plan: refined,
              timestamp: Date.now(),
            },
          );

          return this.buildPreviewResponse(refined);
        } catch {
          // Fall through to show initial plan
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
      },
    );
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
    const { finding, accessToken } = await this.resolveContext(params);

    // Get plan from cache or regenerate
    let plan: GcpFixPlan;
    const cached = this.planCache.get(
      `${params.connectionId}:${params.checkResultId}:${params.remediationKey}`,
    );
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      plan = cached.plan;
    } else {
      const evidence = (finding.evidence ?? {}) as Record<string, unknown>;
      plan = await this.aiRemediationService.generateGcpFixPlan({
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
    if (!plan.fixSteps || plan.fixSteps.length === 0) {
      throw new Error('AI generated an empty fix plan. Cannot proceed.');
    }
    if (!params.acknowledgment || params.acknowledgment !== 'acknowledged') {
      throw new Error(
        'Acknowledgment is required before executing any remediation.',
      );
    }

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

    let previousState: Record<string, unknown> = {};
    let fixResult: { results: Array<{ step: GcpApiStep; output: unknown }>; error?: { stepIndex: number; step: GcpApiStep; message: string } } | undefined;

    try {
      // Phase 1: Execute read steps to get real state
      if (plan.readSteps.length > 0) {
        const readErrors = validateGcpPlanSteps(plan.readSteps);
        if (readErrors.length > 0) {
          throw new Error(`Invalid read steps: ${readErrors.join('; ')}`);
        }
        const readResult = await executeGcpPlanSteps({
          steps: plan.readSteps,
          accessToken,
        });
        previousState = readResult.results.reduce(
          (acc, r) => ({ ...acc, [r.step.purpose]: r.output }),
          {} as Record<string, unknown>,
        );
      }

      // Phase 2: Refine plan with real data
      const evidence = (finding.evidence ?? {}) as Record<string, unknown>;
      let refinedPlan = await this.aiRemediationService.refineGcpFixPlan({
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
        realGcpState: previousState,
      });

      if (!refinedPlan.canAutoFix) {
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

      if (!refinedPlan.fixSteps || refinedPlan.fixSteps.length === 0) {
        throw new Error('AI refined plan has no fix steps. Cannot proceed.');
      }
      let fixErrors = validateGcpPlanSteps(refinedPlan.fixSteps);
      if (fixErrors.length > 0) {
        this.logger.warn(
          `Fix plan validation failed: ${fixErrors.join('; ')} — retrying with error context`,
        );
        const retryPlan = await this.aiRemediationService.refineGcpFixPlan({
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
          originalPlan: refinedPlan,
          realGcpState: {
            ...previousState,
            _validationErrors: fixErrors,
          },
        });
        refinedPlan = retryPlan;
        fixErrors = validateGcpPlanSteps(refinedPlan.fixSteps);
        if (fixErrors.length > 0) {
          throw new Error(`Invalid fix steps after retry: ${fixErrors.join('; ')}`);
        }
      }

      // Phase 3: Execute fix steps with self-healing retry
      // (executor auto-handles: API enablement, throttling, retries, long-running ops)
      for (const step of refinedPlan.fixSteps) {
        this.logger.log(
          `Fix step: ${step.method} ${step.url} — ${step.purpose}`,
        );
      }

      let currentPlan = refinedPlan;
      fixResult = await executeGcpPlanSteps({
        steps: currentPlan.fixSteps,
        accessToken,
        autoRollbackSteps: currentPlan.rollbackSteps,
      });

      // Self-healing: if non-permission error, regenerate plan with error context and retry
      if (fixResult.error) {
        const isPermError =
          fixResult.error.message.includes('Permission denied') ||
          fixResult.error.message.includes('PERMISSION_DENIED');

        if (!isPermError) {
          this.logger.log(
            'Non-permission error — regenerating fix plan with error context...',
          );
          const retryPlan = await this.aiRemediationService.refineGcpFixPlan({
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
            originalPlan: currentPlan,
            realGcpState: {
              ...previousState,
              _lastError: fixResult.error.message,
              _failedStep: fixResult.error.step,
            },
          });

          if (retryPlan.canAutoFix && retryPlan.fixSteps.length > 0) {
            this.logger.log(
              `Retrying with regenerated plan (${retryPlan.fixSteps.length} steps)...`,
            );
            currentPlan = retryPlan;
            fixResult = await executeGcpPlanSteps({
              steps: currentPlan.fixSteps,
              accessToken,
              autoRollbackSteps: currentPlan.rollbackSteps,
            });
          }
        }
      }

      if (fixResult.error) {
        throw new Error(fixResult.error.message);
      }

      // Log step results
      for (const r of fixResult.results) {
        this.logger.log(`Step result: ${r.step.method} ${r.step.url} → OK`);
      }

      // Phase 4: Verify — check the fix step responses for success indicators
      let verified = false;

      // Primary verification: check if the API response from the fix step
      // contains the expected changes (e.g., setIamPolicy returns the updated policy)
      for (const r of fixResult.results) {
        const output = r.output as Record<string, unknown> | undefined;
        if (!output) continue;
        // setIamPolicy returns the updated policy — check if auditConfigs present
        if (
          r.step.url.includes(':setIamPolicy') &&
          Array.isArray(output.auditConfigs) &&
          (output.auditConfigs as unknown[]).length > 0
        ) {
          verified = true;
        }
        // Generic: if the API returned a non-empty response, the call succeeded
        if (Object.keys(output).length > 0 && !verified) {
          verified = true;
        }
      }

      // Fallback verification: re-read and compare (for non-IAM fixes)
      if (!verified && currentPlan.readSteps.length > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        const verifyResult = await executeGcpPlanSteps({
          steps: currentPlan.readSteps,
          accessToken,
        });
        const postFixState: Record<string, unknown> = {};
        for (const r of verifyResult.results) {
          postFixState[r.step.purpose] = r.output;
        }
        const stripVolatile = (obj: unknown): unknown => {
          if (!obj || typeof obj !== 'object') return obj;
          if (Array.isArray(obj)) return obj.map(stripVolatile);
          const cleaned: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(
            obj as Record<string, unknown>,
          )) {
            if (k === 'etag' || k === 'updateTime' || k === 'createTime')
              continue;
            cleaned[k] = stripVolatile(v);
          }
          return cleaned;
        };
        const preStr = JSON.stringify(stripVolatile(previousState));
        const postStr = JSON.stringify(stripVolatile(postFixState));
        verified = postStr !== preStr;
        if (!verified) {
          this.logger.warn(
            `Fix executed but verification shows no state change for ${finding.resourceId}`,
          );
        }
      }

      const appliedState = {
        steps: fixResult.results.map((r) => ({
          command: `${r.step.method} ${r.step.url}`,
          purpose: r.step.purpose,
          output: r.output,
        })),
        rollbackSteps: currentPlan.rollbackSteps,
        verified,
      };

      const status = verified ? 'success' : 'unverified';
      await db.remediationAction.update({
        where: { id: action.id },
        data: {
          status,
          previousState: previousState as Prisma.InputJsonValue,
          appliedState: appliedState as unknown as Prisma.InputJsonValue,
          executedAt: new Date(),
        },
      });

      this.logger.log(
        `GCP remediation executed on ${finding.resourceId} (verified: ${verified})`,
      );
      this.planCache.delete(
        `${params.connectionId}:${params.checkResultId}:${params.remediationKey}`,
      );

      return {
        actionId: action.id,
        status: status,
        resourceId: finding.resourceId,
        previousState,
        appliedState,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Parse GCP permission errors and provide actionable fix
      const evidence = (finding.evidence ?? {}) as Record<string, unknown>;
      const projectId = (evidence.projectDisplayName as string) ?? undefined;
      const permInfo = parseGcpPermissionError(errorMessage, projectId);

      let permissionError:
        | { missingActions: string[]; fixScript?: string }
        | undefined;
      if (permInfo.isPermissionError) {
        permissionError = {
          missingActions: permInfo.missingPermissions,
          ...(permInfo.fixScript && { fixScript: permInfo.fixScript }),
        };
      }

      const hasAutoRollback = Boolean(
        fixResult?.error && fixResult.results.length > 0,
      );

      await db.remediationAction.update({
        where: { id: action.id },
        data: {
          status: 'failed',
          errorMessage,
          previousState: previousState as Prisma.InputJsonValue,
          appliedState: {
            autoRollbackAttempted: hasAutoRollback,
            failedAtStep: fixResult?.error?.stepIndex,
            completedSteps: fixResult?.results.length ?? 0,
            ...(permissionError && {
              missingPermissions: permissionError.missingActions,
              suggestedFix: permissionError.fixScript,
            }),
          } as unknown as Prisma.InputJsonValue,
        },
      });

      this.logger.error(
        `GCP remediation failed: ${errorMessage}${hasAutoRollback ? ' (auto-rollback attempted)' : ''}${permInfo.isPermissionError ? ` | Missing: ${permInfo.missingPermissions.join(', ')}` : ''}`,
      );

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
    const action = await db.remediationAction.findFirst({
      where: { id: params.actionId, organizationId: params.organizationId },
    });

    if (!action) throw new Error('Remediation action not found');
    if (action.status !== 'success' && action.status !== 'unverified') {
      throw new Error(`Cannot rollback action with status "${action.status}"`);
    }

    const appliedState = action.appliedState as Record<string, unknown>;
    const rollbackSteps = (appliedState.rollbackSteps ?? []) as GcpApiStep[];

    if (rollbackSteps.length === 0) {
      throw new Error('No rollback steps available for this action');
    }

    const accessToken = await this.getValidGcpToken(
      action.connectionId,
      action.organizationId,
    );

    try {
      this.logger.log(
        `Rolling back GCP action ${action.id}: ${rollbackSteps.length} steps`,
      );
      for (const step of rollbackSteps) {
        this.logger.log(
          `Rollback step: ${step.method} ${step.url} — ${step.purpose}`,
        );
      }

      const result = await executeGcpPlanSteps({
        steps: rollbackSteps,
        accessToken,
        isRollback: true,
      });

      // Log each rollback step result
      for (const r of result.results) {
        this.logger.log(`Rollback result: ${r.step.method} ${r.step.url} → OK`);
      }

      if (result.error) throw new Error(result.error.message);

      await db.remediationAction.update({
        where: { id: action.id },
        data: { status: 'rolled_back', rolledBackAt: new Date() },
      });

      this.logger.log(
        `GCP rollback: ${action.remediationKey} on ${action.resourceId}`,
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

      await db.remediationAction.update({
        where: { id: action.id },
        data: {
          status: 'rollback_failed',
          errorMessage: `Rollback failed: ${errorMessage}`,
        },
      });

      // If permission error, include actionable info
      const permInfo = parseGcpPermissionError(errorMessage);
      if (permInfo.isPermissionError) {
        throw new Error(
          JSON.stringify({
            message: 'Rollback failed: missing permissions',
            missingActions: permInfo.missingPermissions,
            script: permInfo.fixScript,
          }),
        );
      }

      throw new Error(`Rollback failed: ${errorMessage}`);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────

  private async resolveContext(params: {
    connectionId: string;
    organizationId: string;
    checkResultId: string;
    remediationKey: string;
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
    if (connection.provider.slug !== 'gcp') {
      throw new Error('This service only handles GCP connections');
    }

    const finding = await db.integrationCheckResult.findFirst({
      where: {
        id: params.checkResultId,
        checkRun: { connectionId: params.connectionId },
      },
    });
    if (!finding) throw new Error('Finding not found');

    const accessToken = await this.getValidGcpToken(
      params.connectionId,
      params.organizationId,
    );

    return { finding, accessToken };
  }

  /**
   * Get a valid GCP access token, refreshing if expired.
   */
  private async getValidGcpToken(
    connectionId: string,
    organizationId: string,
  ): Promise<string> {
    const manifest = getManifest('gcp');
    const oauthConfig = manifest?.auth?.type === 'oauth2' ? manifest.auth.config : null;

    if (oauthConfig) {
      const oauthCreds = await this.oauthCredentialsService.getCredentials(
        'gcp',
        organizationId,
      );
      if (oauthCreds) {
        const token = await this.credentialVaultService.getValidAccessToken(
          connectionId,
          {
            tokenUrl: oauthConfig.tokenUrl,
            clientId: oauthCreds.clientId,
            clientSecret: oauthCreds.clientSecret,
            clientAuthMethod: oauthConfig.clientAuthMethod,
          },
        );
        if (token) return token;
      }
    }

    // Fallback to raw credentials if refresh fails
    const credentials =
      await this.credentialVaultService.getDecryptedCredentials(connectionId);
    const token = credentials?.access_token as string;
    if (!token) {
      throw new Error(
        'GCP access token not found. Please reconnect the integration.',
      );
    }
    return token;
  }

  private buildPreviewResponse(plan: GcpFixPlan) {
    const apiCalls = plan.fixSteps.map((s) => {
      try {
        return `${s.method} ${new URL(s.url).pathname}`;
      } catch {
        return `${s.method} ${s.url}`;
      }
    });

    return {
      currentState: plan.currentState,
      proposedState: plan.proposedState,
      description: plan.description,
      risk: plan.risk,
      apiCalls,
      guidedOnly: false,
      rollbackSupported: plan.rollbackSupported,
      requiresAcknowledgment: 'checkbox' as const,
      acknowledgmentMessage:
        'This fix will modify your GCP infrastructure. Please review the changes above before proceeding.',
    };
  }
}
