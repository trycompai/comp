import {
  Controller,
  Post,
  Param,
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
}
