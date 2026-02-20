import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Headers,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { OrganizationId } from '../auth/auth-context.decorator';
import {
  CloudSecurityService,
  ConnectionNotFoundError,
} from './cloud-security.service';

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
  @UseGuards(HybridAuthGuard)
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
  @UseGuards(HybridAuthGuard)
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
}
