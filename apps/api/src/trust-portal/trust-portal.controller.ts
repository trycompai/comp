import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import {
  DomainStatusResponseDto,
  GetDomainStatusDto,
} from './dto/domain-status.dto';
import { TrustPortalService } from './trust-portal.service';

@ApiTags('Trust Portal')
@Controller({ path: 'trust-portal', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class TrustPortalController {
  constructor(private readonly trustPortalService: TrustPortalService) {}

  @Get('domain/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get domain verification status',
    description:
      'Retrieve the verification status and DNS records for a custom domain configured in the Vercel trust portal project',
  })
  @ApiQuery({
    name: 'domain',
    description: 'The domain name to check status for',
    example: 'portal.example.com',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Domain status retrieved successfully',
    type: DomainStatusResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve domain status from Vercel',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  async getDomainStatus(
    @Query() dto: GetDomainStatusDto,
  ): Promise<DomainStatusResponseDto> {
    return this.trustPortalService.getDomainStatus(dto);
  }
}
