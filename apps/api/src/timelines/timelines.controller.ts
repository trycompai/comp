import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { OrganizationId } from '../auth/auth-context.decorator';
import { TimelinesService } from './timelines.service';

@ApiTags('Timelines')
@ApiBearerAuth()
@UseGuards(HybridAuthGuard, PermissionGuard)
@Controller({ path: 'timelines', version: '1' })
export class TimelinesController {
  private readonly logger = new Logger(TimelinesController.name);

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

    this.sendSlackNotification(result).catch((err) => {
      this.logger.warn('Failed to send Slack notification', err);
    });

    return result;
  }

  private async sendSlackNotification(result: {
    organization: { id: string; name: string };
    framework: { name: string };
    phase: { name: string };
  }) {
    const webhookUrl = process.env.SLACK_CX_WEBHOOK_URL;
    if (!webhookUrl) return;

    const text = [
      `*Timeline Phase Ready for Review*`,
      `Org: ${result.organization.name} (${result.organization.id})`,
      `Framework: ${result.framework.name}`,
      `Phase: ${result.phase.name}`,
    ].join('\n');

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  }
}
