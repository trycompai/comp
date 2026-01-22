import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { AuthContext } from '../auth/auth-context.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import {
  DomainStatusResponseDto,
  GetDomainStatusDto,
} from './dto/domain-status.dto';
import {
  ComplianceResourceResponseDto,
  ComplianceResourceSignedUrlDto,
  ComplianceResourceUrlResponseDto,
  UploadComplianceResourceDto,
} from './dto/compliance-resource.dto';
import {
  DeleteTrustDocumentDto,
  TrustDocumentResponseDto,
  TrustDocumentSignedUrlDto,
  TrustDocumentUrlResponseDto,
  UploadTrustDocumentDto,
} from './dto/trust-document.dto';
import { TrustPortalService } from './trust-portal.service';

class ListComplianceResourcesDto {
  @ApiProperty({
    description: 'Organization ID that owns the compliance resources',
    example: 'org_6914cd0e16e4c7dccbb54426',
  })
  @IsString()
  organizationId!: string;
}

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

  @Post('compliance-resources/upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload or replace a compliance certificate (PDF only)',
    description:
      'Stores the compliance certificate in the organization assets bucket and replaces any previous file for the same framework.',
  })
  @ApiBody({ type: UploadComplianceResourceDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Compliance certificate uploaded successfully',
    type: ComplianceResourceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Framework not compliant, PDF validation failed, or organization mismatch',
  })
  async uploadComplianceResource(
    @Body() dto: UploadComplianceResourceDto,
    @AuthContext() authContext: AuthContextType,
  ): Promise<ComplianceResourceResponseDto> {
    this.assertOrganizationAccess(dto.organizationId, authContext);
    return this.trustPortalService.uploadComplianceResource(dto);
  }

  @Post('compliance-resources/signed-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a temporary signed URL for a compliance certificate',
  })
  @ApiBody({ type: ComplianceResourceSignedUrlDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Signed URL generated successfully',
    type: ComplianceResourceUrlResponseDto,
  })
  async getComplianceResourceUrl(
    @Body() dto: ComplianceResourceSignedUrlDto,
    @AuthContext() authContext: AuthContextType,
  ): Promise<ComplianceResourceUrlResponseDto> {
    this.assertOrganizationAccess(dto.organizationId, authContext);
    return this.trustPortalService.getComplianceResourceUrl(dto);
  }

  @Post('compliance-resources/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List uploaded compliance certificates for the organization',
  })
  @ApiBody({ type: ListComplianceResourcesDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compliance certificates retrieved successfully',
    type: [ComplianceResourceResponseDto],
  })
  async listComplianceResources(
    @Body() dto: ListComplianceResourcesDto,
    @AuthContext() authContext: AuthContextType,
  ): Promise<ComplianceResourceResponseDto[]> {
    this.assertOrganizationAccess(dto.organizationId, authContext);
    return this.trustPortalService.listComplianceResources(dto.organizationId);
  }

  @Post('documents/upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload an additional trust portal document',
    description:
      'Stores a document in the organization assets bucket and registers it for the trust portal.',
  })
  @ApiBody({ type: UploadTrustDocumentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Document uploaded successfully',
    type: TrustDocumentResponseDto,
  })
  async uploadTrustDocument(
    @Body() dto: UploadTrustDocumentDto,
    @AuthContext() authContext: AuthContextType,
  ): Promise<TrustDocumentResponseDto> {
    this.assertOrganizationAccess(dto.organizationId, authContext);
    return this.trustPortalService.uploadTrustDocument(dto);
  }

  @Post('documents/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List additional trust portal documents for the organization',
  })
  @ApiBody({ type: ListComplianceResourcesDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Documents retrieved successfully',
    type: [TrustDocumentResponseDto],
  })
  async listTrustDocuments(
    @Body() dto: ListComplianceResourcesDto,
    @AuthContext() authContext: AuthContextType,
  ): Promise<TrustDocumentResponseDto[]> {
    this.assertOrganizationAccess(dto.organizationId, authContext);
    return this.trustPortalService.listTrustDocuments(dto.organizationId);
  }

  @Post('documents/:documentId/download')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a temporary signed URL for a trust portal document',
  })
  @ApiBody({ type: TrustDocumentSignedUrlDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Signed URL generated successfully',
    type: TrustDocumentUrlResponseDto,
  })
  async getTrustDocumentUrl(
    @Body() dto: TrustDocumentSignedUrlDto,
    @Param('documentId') documentId: string,
    @AuthContext() authContext: AuthContextType,
  ): Promise<TrustDocumentUrlResponseDto> {
    this.assertOrganizationAccess(dto.organizationId, authContext);
    return this.trustPortalService.getTrustDocumentUrl(documentId, dto);
  }

  @Post('documents/:documentId/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete (deactivate) a trust portal document',
  })
  @ApiBody({ type: DeleteTrustDocumentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  async deleteTrustDocument(
    @Body() dto: DeleteTrustDocumentDto,
    @Param('documentId') documentId: string,
    @AuthContext() authContext: AuthContextType,
  ): Promise<{ success: boolean }> {
    this.assertOrganizationAccess(dto.organizationId, authContext);
    return this.trustPortalService.deleteTrustDocument(documentId, dto);
  }

  private assertOrganizationAccess(
    organizationId: string,
    authContext: AuthContextType,
  ): void {
    if (organizationId !== authContext.organizationId) {
      throw new BadRequestException(
        'Organization mismatch. You can only manage resources for your own organization.',
      );
    }
  }
}
