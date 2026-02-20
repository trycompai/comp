import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CloudSecurityService } from './cloud-security.service';

@Controller({ path: 'cloud-security', version: '1' })
export class CloudSecurityController {
  private readonly logger = new Logger(CloudSecurityController.name);

  constructor(private readonly cloudSecurityService: CloudSecurityService) {}

  @Post('scan/:connectionId')
  async scan(
    @Param('connectionId') connectionId: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new HttpException(
        'Organization ID required',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(
      `Cloud security scan requested for connection ${connectionId}`,
    );

    const result = await this.cloudSecurityService.scan(
      connectionId,
      organizationId,
    );

    if (!result.success) {
      throw new HttpException(
        {
          message: result.error || 'Scan failed',
          provider: result.provider,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: true,
      provider: result.provider,
      findingsCount: result.findings.length,
      scannedAt: result.scannedAt,
    };
  }

  @Post('trigger/:connectionId')
  async triggerScan(
    @Param('connectionId') connectionId: string,
    @Body('organizationId') organizationId: string,
  ) {
    if (!organizationId) {
      throw new HttpException(
        'Organization ID required',
        HttpStatus.BAD_REQUEST,
      );
    }

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
  async getRunStatus(@Param('runId') runId: string) {
    try {
      return await this.cloudSecurityService.getRunStatus(runId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get run status';
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
