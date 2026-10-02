import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { OrganizationId, UserId } from '../auth/auth-context.decorator';
import {
  CancelRemediationBatchDto,
  CreateRemediationBatchDto,
  UpdateRemediationBatchDto,
} from './dto/remediation-batch.dto';
import { RemediationBatchService } from './remediation-batch.service';

@Controller({ path: 'cloud-security/remediation/batch', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
export class RemediationBatchController {
  constructor(private readonly batches: RemediationBatchService) {}

  @Get('active')
  @RequirePermission('integration', 'read')
  @ApiOperation({
    summary: 'Get the active remediation batch',
    description:
      'Finds the pending or running remediation batch for a connection in your organization. Use to resume remediation progress.',
  })
  async getActiveBatch(
    @Query('connectionId') connectionId: string,
    @OrganizationId() organizationId: string,
  ) {
    return {
      data: await this.batches.getActive({ connectionId, organizationId }),
    };
  }

  @Post()
  @RequirePermission('integration', 'update')
  @ApiBody({ type: CreateRemediationBatchDto })
  @ApiOperation({
    summary: 'Create a remediation batch',
    description:
      'Creates a pending batch after validating the connection and findings in your organization. This records the batch; execution is started separately.',
  })
  async createBatch(
    @Body() body: CreateRemediationBatchDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    return {
      data: await this.batches.create({ body, organizationId, userId }),
    };
  }

  @Patch(':batchId')
  @RequirePermission('integration', 'update')
  @ApiBody({ type: UpdateRemediationBatchDto })
  @ApiOperation({
    summary: 'Update a remediation batch',
    description:
      'Updates a batch in your organization. A Trigger.dev run can only be bound if its task, payload, and organization match the batch.',
  })
  async updateBatch(
    @Param('batchId') batchId: string,
    @Body() body: UpdateRemediationBatchDto,
    @OrganizationId() organizationId: string,
  ) {
    return {
      data: await this.batches.update({ batchId, body, organizationId }),
    };
  }

  @Post(':batchId/cancel')
  @RequirePermission('integration', 'update')
  @ApiBody({ type: CancelRemediationBatchDto })
  @ApiOperation({
    summary: 'Cancel a remediation batch',
    description:
      'Cancels the validated Trigger.dev run already bound to a batch in your organization. Use to stop pending cloud remediation.',
  })
  async cancelBatch(
    @Param('batchId') batchId: string,
    @Body() body: CancelRemediationBatchDto,
    @OrganizationId() organizationId: string,
  ) {
    return {
      data: await this.batches.cancel({
        batchId,
        organizationId,
        runId: body.runId,
      }),
    };
  }

  @Post(':batchId/skip/:findingId')
  @RequirePermission('integration', 'update')
  @ApiOperation({
    summary: 'Skip a remediation batch finding',
    description:
      'Skips a pending finding in a batch belonging to your organization. Use to omit an individual cloud fix without cancelling the batch.',
  })
  async skipFinding(
    @Param('batchId') batchId: string,
    @Param('findingId') findingId: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.batches.skip({ batchId, findingId, organizationId });
  }
}
