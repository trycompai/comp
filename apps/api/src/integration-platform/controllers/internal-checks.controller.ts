import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { IsOptional, IsString } from 'class-validator';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { ServiceTokenOnlyGuard } from '../../auth/service-token-only.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { OrganizationId } from '../../auth/auth-context.decorator';
import {
  ConnectionCheckRunnerService,
  type RunAllChecksResult,
} from '../services/connection-check-runner.service';

// Internal payload. Service-token only — never called by the UI/customers.
class RunConnectionChecksOnServerDto {
  @ApiPropertyOptional({
    description:
      "Run a single check. Omit to run all of the connection's checks.",
  })
  @IsOptional()
  @IsString()
  checkId?: string;
}

/**
 * Internal, service-token-only endpoint that runs a connection's checks ON OUR
 * SERVER and returns the raw result (no persistence). Used exclusively by the
 * AWS Trigger tasks so AWS S3 calls egress our VPC instead of Trigger.dev's
 * (whose endpoint policy blocks our cross-account reads). All other providers
 * keep executing inside Trigger.dev unchanged.
 */
@Controller({ path: 'integrations/internal', version: '1' })
@ApiTags('Integrations')
export class InternalChecksController {
  constructor(private readonly runner: ConnectionCheckRunnerService) {}

  @Post('run-connection-checks/:connectionId')
  // Called by the AWS Trigger tasks in bursts (the 6 AM schedule fans out across
  // every AWS connection/check). Exempt from the global rate limiter so the burst
  // doesn't hit 429s and re-fail the very checks this path exists to fix.
  @SkipThrottle()
  @UseGuards(HybridAuthGuard, ServiceTokenOnlyGuard, PermissionGuard)
  @RequirePermission('integration', 'update')
  @ApiOperation({
    summary: "Run a connection's checks on the API server (internal only)",
  })
  @ApiBody({ type: RunConnectionChecksOnServerDto })
  async runConnectionChecks(
    @Param('connectionId') connectionId: string,
    @OrganizationId() organizationId: string,
    @Body() body: RunConnectionChecksOnServerDto,
  ): Promise<RunAllChecksResult> {
    return this.runner.runChecks({
      connectionId,
      organizationId,
      checkId: body.checkId,
    });
  }
}
