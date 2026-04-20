import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { OrganizationId } from '../auth/auth-context.decorator';
import { TimelinesService } from './timelines.service';
import { notifyReadyForReview } from './timelines-slack.helper';

@ApiTags('Timelines')
@ApiBearerAuth()
@UseGuards(HybridAuthGuard, PermissionGuard)
@Controller({ path: 'timelines', version: '1' })
export class TimelinesController {
  constructor(private readonly timelinesService: TimelinesService) {}

  @Get()
  @RequirePermission('framework', 'read')
  @ApiOperation({ summary: 'List timelines for the organization' })
  async findAll(@OrganizationId() organizationId: string) {
    const data =
      await this.timelinesService.findAllForOrganization(organizationId);
    return { data, count: data.length };
  }

  @Get(':id')
  @RequirePermission('framework', 'read')
  @ApiOperation({ summary: 'Get a single timeline instance with phases' })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.timelinesService.findOne(id, organizationId);
  }

  @Post(':id/phases/:phaseId/ready')
  @RequirePermission('framework', 'update')
  @ApiOperation({ summary: 'Mark a phase as ready for review' })
  async markReadyForReview(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
  ) {
    const result = await this.timelinesService.markReadyForReview(
      id,
      phaseId,
      organizationId,
    );

    // Only notify Slack on the first transition — service returns
    // alreadyReady=true on retries / double-clicks so the CX channel
    // doesn't get pinged repeatedly for the same phase.
    if (!result.alreadyReady) {
      notifyReadyForReview({
        orgId: organizationId,
        orgName: result.organization.name,
        frameworkName: result.framework?.name ?? 'Unknown framework',
        phaseName: result.phase.name,
      });
    }

    return result;
  }
}
