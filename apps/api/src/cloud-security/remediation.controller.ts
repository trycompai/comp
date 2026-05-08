import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Query,
  Body,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { db } from '@db';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { OrganizationId, UserId } from '../auth/auth-context.decorator';
import { RemediationService } from './remediation.service';
import { logCloudSecurityActivity } from './cloud-security-audit';

@Controller({ path: 'cloud-security/remediation', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
export class RemediationController {
  private readonly logger = new Logger(RemediationController.name);

  constructor(private readonly remediationService: RemediationService) {}

  @Get('capabilities')
  @SkipThrottle()
  @RequirePermission('integration', 'read')
  @ApiOperation({ summary: 'List remediation capabilities' })
  async getCapabilities(
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
      return await this.remediationService.getCapabilities({
        connectionId,
        organizationId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get capabilities';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('preview')
  @RequirePermission('integration', 'update')
  @ApiOperation({ summary: 'Preview a remediation' })
  async preview(
    @Body()
    body: {
      connectionId: string;
      checkResultId: string;
      remediationKey: string;
      cachedPermissions?: string[];
    },
    @OrganizationId() organizationId: string,
  ) {
    try {
      return await this.remediationService.previewRemediation({
        connectionId: body.connectionId,
        organizationId,
        checkResultId: body.checkResultId,
        remediationKey: body.remediationKey,
        cachedPermissions: body.cachedPermissions,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Preview failed';
      this.logger.error(`Remediation preview failed: ${message}`);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('execute')
  @RequirePermission('integration', 'update')
  @ApiOperation({ summary: 'Execute a remediation' })
  async execute(
    @Body()
    body: {
      connectionId: string;
      checkResultId: string;
      remediationKey: string;
      acknowledgment?: string;
    },
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    try {
      const result = await this.remediationService.executeRemediation({
        connectionId: body.connectionId,
        organizationId,
        checkResultId: body.checkResultId,
        remediationKey: body.remediationKey,
        userId,
        acknowledgment: body.acknowledgment,
      });

      if (result.status === 'success') {
        await logCloudSecurityActivity({
          organizationId,
          userId,
          connectionId: body.connectionId,
          action: 'remediation_executed',
          description: `Applied auto-fix: ${body.remediationKey} on ${result.resourceId}`,
          metadata: {
            remediationKey: body.remediationKey,
            actionId: result.actionId,
            resourceId: result.resourceId,
            acknowledgmentText: body.acknowledgment,
            acknowledgedBy: userId,
            acknowledgedAt: new Date().toISOString(),
            previousState: result.previousState,
            appliedState: result.appliedState,
            verified: (result.appliedState as Record<string, unknown>)
              ?.verified,
          },
        });
      } else if (result.status === 'failed') {
        await logCloudSecurityActivity({
          organizationId,
          userId,
          connectionId: body.connectionId,
          action: 'remediation_failed',
          description: `Auto-fix failed: ${body.remediationKey} on ${result.resourceId} — ${result.error}`,
          metadata: {
            remediationKey: body.remediationKey,
            actionId: result.actionId,
            resourceId: result.resourceId,
            acknowledgmentText: body.acknowledgment,
            acknowledgedBy: userId,
            error: result.error,
          },
        });
      } else {
        await logCloudSecurityActivity({
          organizationId,
          userId,
          connectionId: body.connectionId,
          action: 'remediation_failed',
          description: `Auto-fix did not succeed: ${body.remediationKey} on ${result.resourceId} (status ${result.status})`,
          metadata: {
            remediationKey: body.remediationKey,
            actionId: result.actionId,
            resourceId: result.resourceId,
            acknowledgmentText: body.acknowledgment,
            acknowledgedBy: userId,
            status: result.status,
          },
        });
      }

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Execution failed';
      this.logger.error(`Remediation execution failed: ${message}`);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':actionId/rollback')
  @RequirePermission('integration', 'update')
  @ApiOperation({ summary: 'Roll back a remediation action' })
  async rollback(
    @Param('actionId') actionId: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    try {
      const result = await this.remediationService.rollbackRemediation({
        actionId,
        organizationId,
      });

      const isSuccess = result.status === 'rolled_back';
      await logCloudSecurityActivity({
        organizationId,
        userId,
        connectionId: result.connectionId,
        action: isSuccess ? 'rollback_executed' : 'rollback_failed',
        description: isSuccess
          ? `Rolled back: ${result.remediationKey} on ${result.resourceId}`
          : `Rollback failed: ${result.remediationKey} on ${result.resourceId} — ${(result as { error?: string }).error}`,
        metadata: {
          actionId,
          remediationKey: result.remediationKey,
          resourceId: result.resourceId,
          status: result.status,
          rolledBackBy: userId,
          rolledBackAt: new Date().toISOString(),
          ...((result as { error?: string }).error && {
            error: (result as { error?: string }).error,
          }),
        },
      });

      return result;
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'Rollback failed';
      this.logger.error(`Remediation rollback failed: ${raw}`);

      // Log the failure to audit trail
      await logCloudSecurityActivity({
        organizationId,
        userId,
        connectionId: actionId, // best effort — action ID as fallback
        action: 'rollback_failed',
        description: `Rollback failed for action ${actionId}: ${raw}`,
        metadata: { actionId, error: raw, rolledBackBy: userId },
      }).catch(() => {}); // don't let audit log failure block the response

      // Try to parse structured permission error
      try {
        const parsed = JSON.parse(raw);
        if (parsed.missingActions) {
          throw new HttpException(
            {
              message: parsed.message,
              missingActions: parsed.missingActions,
              script: parsed.script,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      } catch (parseErr) {
        if (parseErr instanceof HttpException) throw parseErr;
      }

      throw new HttpException(raw, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('actions')
  @RequirePermission('integration', 'read')
  @ApiOperation({ summary: 'List remediation actions' })
  async getActions(
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
      const actions = await this.remediationService.getActions({
        connectionId,
        organizationId,
      });
      return { data: actions, count: actions.length };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get actions';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  // ─── Batch endpoints ──────────────────────────────────────────────

  /** Get active batch for a connection (if any). */
  @Get('batch/active')
  @RequirePermission('integration', 'read')
  @ApiOperation({ summary: 'Get the active remediation batch' })
  async getActiveBatch(
    @Query('connectionId') connectionId: string,
    @OrganizationId() organizationId: string,
  ) {
    const batch = await db.remediationBatch.findFirst({
      where: {
        connectionId,
        organizationId,
        status: { in: ['pending', 'running'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: batch };
  }

  /** Create a new batch record (called before triggering the task). */
  @Post('batch')
  @RequirePermission('integration', 'update')
  @ApiOperation({ summary: 'Create a remediation batch' })
  async createBatch(
    @Body()
    body: {
      connectionId: string;
      findings: Array<{ id: string; key: string; title: string }>;
    },
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const findings = body.findings.map((f) => ({
      id: f.id,
      key: f.key,
      title: f.title,
      status: 'pending',
    }));

    const batch = await db.remediationBatch.create({
      data: {
        connectionId: body.connectionId,
        organizationId,
        initiatedById: userId,
        status: 'pending',
        findings,
      },
    });

    await logCloudSecurityActivity({
      organizationId,
      userId,
      connectionId: body.connectionId,
      action: 'remediation_executed',
      description: `Started batch fix: ${body.findings.length} findings`,
      metadata: { batchId: batch.id, findingCount: body.findings.length },
    });

    return { data: batch };
  }

  /** Update a batch (set triggerRunId after task starts). */
  @Patch('batch/:batchId')
  @RequirePermission('integration', 'update')
  @ApiOperation({ summary: 'Update a remediation batch' })
  async updateBatch(
    @Param('batchId') batchId: string,
    @Body() body: { triggerRunId?: string; status?: string },
    @OrganizationId() organizationId: string,
  ) {
    const batch = await db.remediationBatch.update({
      where: { id: batchId, organizationId },
      data: {
        ...(body.triggerRunId && { triggerRunId: body.triggerRunId }),
        ...(body.status && { status: body.status }),
      },
    });
    return { data: batch };
  }

  /** Skip a specific finding in an active batch. */
  @Post('batch/:batchId/skip/:findingId')
  @RequirePermission('integration', 'update')
  @ApiOperation({ summary: 'Skip a finding in a remediation batch' })
  async skipFinding(
    @Param('batchId') batchId: string,
    @Param('findingId') findingId: string,
    @OrganizationId() organizationId: string,
  ) {
    const batch = await db.remediationBatch.findFirst({
      where: { id: batchId, organizationId },
    });
    if (!batch) {
      throw new HttpException('Batch not found', HttpStatus.NOT_FOUND);
    }

    const findings = batch.findings as Array<{ id: string; status: string }>;
    const updated = findings.map((f) =>
      f.id === findingId && f.status === 'pending'
        ? { ...f, status: 'cancelled' }
        : f,
    );

    await db.remediationBatch.update({
      where: { id: batchId },
      data: { findings: updated },
    });

    return { success: true };
  }
}
