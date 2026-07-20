import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
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
import type {
  CreateCustomLinkDto,
  ReorderCustomLinksDto,
  UpdateCustomLinkDto,
} from './dto/trust-custom-link.dto';
import {
  CreateCustomLinkSchema,
  ReorderCustomLinksSchema,
  UpdateCustomLinkSchema,
} from './dto/trust-custom-link.dto';
import type { UpdateTrustOverviewDto } from './dto/update-trust-overview.dto';
import { UpdateTrustOverviewSchema } from './dto/update-trust-overview.dto';
import type { UpdateSecurityQuestionnaireDto } from './dto/update-security-questionnaire.dto';
import { UpdateSecurityQuestionnaireSchema } from './dto/update-security-questionnaire.dto';
import { UpdateAllowedEmailsDto } from './dto/update-allowed-emails.dto';
import type { UpdateVendorTrustSettingsDto } from './dto/trust-vendor.dto';
import { UpdateVendorTrustSettingsSchema } from './dto/trust-vendor.dto';
import {
  UpdateTrustCustomFrameworkSchema,
  type UpdateTrustCustomFrameworkDto,
  UploadCustomFrameworkBadgeDto,
  RemoveCustomFrameworkBadgeQueryDto,
  CustomFrameworkBadgeResponseDto,
} from './dto/trust-custom-framework.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { TrustPortalService } from './trust-portal.service';
import { TrustCustomFrameworkService } from './trust-custom-framework.service';
import { TrustCustomFrameworkBadgeService } from './trust-custom-framework-badge.service';

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
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class TrustPortalController {
  constructor(
    private readonly trustPortalService: TrustPortalService,
    private readonly trustCustomFrameworkService: TrustCustomFrameworkService,
    private readonly trustCustomFrameworkBadgeService: TrustCustomFrameworkBadgeService,
  ) {}

  @Get('settings')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trust', 'read')
  @ApiOperation({
    summary: 'Get complete trust portal settings for admin page',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trust portal settings retrieved successfully',
  })
  async getSettings(@OrganizationId() organizationId: string) {
    return this.trustPortalService.getSettings(organizationId);
  }

  @Post('favicon')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('trust', 'update')
  @ApiOperation({
    summary: 'Upload a favicon for the trust portal',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Favicon uploaded successfully',
  })
  async uploadFavicon(
    @OrganizationId() organizationId: string,
    @Body() body: { fileName: string; fileType: string; fileData: string },
  ) {
    return this.trustPortalService.uploadFavicon(organizationId, body);
  }

  @Delete('favicon')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trust', 'update')
  @ApiOperation({
    summary: 'Remove the trust portal favicon',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Favicon removed successfully',
  })
  async removeFavicon(@OrganizationId() organizationId: string) {
    return this.trustPortalService.removeFavicon(organizationId);
  }

  @Get('domain/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trust', 'read')
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
  @RequirePermission('trust', 'update')
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
  @RequirePermission('trust', 'read')
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
  @RequirePermission('trust', 'read')
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
  @RequirePermission('trust', 'update')
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
  @RequirePermission('trust', 'read')
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
  @RequirePermission('trust', 'read')
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
  @RequirePermission('trust', 'update')
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

  @Put('settings/toggle')
  @RequirePermission('trust', 'update')
  @ApiOperation({ summary: 'Enable or disable the trust portal' })
  async togglePortal(
    @OrganizationId() organizationId: string,
    @Body()
    body: {
      enabled: boolean;
      contactEmail?: string;
      primaryColor?: string;
    },
  ) {
    return this.trustPortalService.togglePortal(
      organizationId,
      body.enabled,
      body.contactEmail,
      body.primaryColor,
    );
  }

  @Post('settings/custom-domain')
  @RequirePermission('trust', 'update')
  @ApiOperation({
    summary: 'Add or update a custom domain for the trust portal',
  })
  async addCustomDomain(
    @OrganizationId() organizationId: string,
    @Body() body: { domain: string },
  ) {
    if (!body.domain) {
      throw new BadRequestException('Domain is required');
    }
    return this.trustPortalService.addCustomDomain(organizationId, body.domain);
  }

  @Post('settings/check-dns')
  @RequirePermission('trust', 'update')
  @ApiOperation({ summary: 'Check DNS records for a custom domain' })
  async checkDnsRecords(
    @OrganizationId() organizationId: string,
    @Body() body: { domain: string },
  ) {
    if (!body.domain) {
      throw new BadRequestException('Domain is required');
    }
    return this.trustPortalService.checkDnsRecords(organizationId, body.domain);
  }

  @Put('settings/faqs')
  @RequirePermission('trust', 'update')
  @ApiOperation({ summary: 'Update trust portal FAQs' })
  // organizationId comes from the authenticated context (@OrganizationId), so the
  // body only carries faqs. Without an explicit @ApiBody the generated spec has no
  // request body and the MCP tool can't send FAQs at all. (CS-752)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['faqs'],
      properties: {
        faqs: {
          type: 'array',
          items: {
            type: 'object',
            required: ['question', 'answer'],
            properties: {
              question: { type: 'string' },
              answer: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async updateFaqs(
    @OrganizationId() organizationId: string,
    @Body() body: { faqs: Array<{ question: string; answer: string }> },
  ) {
    return this.trustPortalService.updateFaqs(organizationId, body.faqs ?? []);
  }

  @Put('settings/allowed-domains')
  @RequirePermission('trust', 'update')
  @ApiOperation({ summary: 'Update allowed domains for the trust portal' })
  async updateAllowedDomains(
    @OrganizationId() organizationId: string,
    @Body() body: { domains: string[] },
  ) {
    return this.trustPortalService.updateAllowedDomains(
      organizationId,
      body.domains ?? [],
    );
  }

  @Put('settings/allowed-emails')
  @RequirePermission('trust', 'update')
  @ApiOperation({ summary: 'Update allowed emails for the trust portal' })
  @ApiBody({ type: UpdateAllowedEmailsDto })
  async updateAllowedEmails(
    @OrganizationId() organizationId: string,
    @Body() body: UpdateAllowedEmailsDto,
  ) {
    return this.trustPortalService.updateAllowedEmails(
      organizationId,
      body.emails ?? [],
    );
  }

  @Put('settings/frameworks')
  @RequirePermission('trust', 'update')
  @ApiOperation({ summary: 'Update trust portal framework settings' })
  async updateFrameworks(
    @OrganizationId() organizationId: string,
    @Body() body: Record<string, boolean | string | undefined>,
  ) {
    return this.trustPortalService.updateFrameworks(organizationId, body);
  }

  @Put('settings/security-questionnaire')
  @RequirePermission('trust', 'update')
  @ApiOperation({
    summary: 'Show or hide the Security Questionnaire on the public trust portal',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['enabled'],
      properties: {
        enabled: {
          type: 'boolean',
          description:
            'When false, the Security Questionnaire is hidden from the public trust portal.',
        },
      },
    },
  })
  async updateSecurityQuestionnaire(
    @OrganizationId() organizationId: string,
    @Body(new ZodValidationPipe(UpdateSecurityQuestionnaireSchema))
    body: UpdateSecurityQuestionnaireDto,
  ) {
    return this.trustPortalService.updateSecurityQuestionnaireEnabled(
      organizationId,
      body.enabled,
    );
  }

  @Get('custom-frameworks')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trust', 'read')
  @ApiOperation({
    summary:
      'List org-authored custom frameworks with their trust portal selection',
  })
  async listCustomFrameworks(@OrganizationId() organizationId: string) {
    return this.trustCustomFrameworkService.listForOrg(organizationId);
  }

  @Put('custom-frameworks')
  @RequirePermission('trust', 'update')
  @ApiOperation({
    summary:
      'Enable/disable a custom framework on the trust portal and set its status',
  })
  @ApiBody({
    description: 'At least one of `enabled` or `status` must be provided.',
    schema: {
      type: 'object',
      required: ['customFrameworkId'],
      // Mirrors UpdateTrustCustomFrameworkSchema's .refine(): the id is
      // required and at least one mutable field must be present.
      anyOf: [{ required: ['enabled'] }, { required: ['status'] }],
      properties: {
        customFrameworkId: { type: 'string', minLength: 1 },
        enabled: { type: 'boolean' },
        status: {
          type: 'string',
          enum: ['started', 'in_progress', 'compliant'],
        },
      },
    },
  })
  async updateCustomFramework(
    @OrganizationId() organizationId: string,
    // Validate via the pipe so a malformed body returns 400 (matching the
    // @ApiBody/MCP contract) instead of an inline .parse() throwing a raw
    // ZodError that surfaces as a 500.
    @Body(new ZodValidationPipe(UpdateTrustCustomFrameworkSchema))
    dto: UpdateTrustCustomFrameworkDto,
  ) {
    return this.trustCustomFrameworkService.updateSelection(
      organizationId,
      dto,
    );
  }

  @Post('custom-frameworks/badge')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('trust', 'update')
  @ApiOperation({
    summary: "Upload or replace a custom framework's Trust Portal badge image",
    description:
      "Stores a PNG/JPEG/WebP badge (max 256KB) in the organization assets bucket. Does not change the framework's portal visibility.",
  })
  @ApiBody({ type: UploadCustomFrameworkBadgeDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Badge uploaded successfully',
    type: CustomFrameworkBadgeResponseDto,
  })
  async uploadCustomFrameworkBadge(
    @OrganizationId() organizationId: string,
    @Body() dto: UploadCustomFrameworkBadgeDto,
  ): Promise<CustomFrameworkBadgeResponseDto> {
    return this.trustCustomFrameworkBadgeService.uploadBadge(
      organizationId,
      dto,
    );
  }

  @Delete('custom-frameworks/badge')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trust', 'update')
  @ApiOperation({
    summary: "Remove a custom framework's Trust Portal badge image",
  })
  @ApiQuery({
    name: 'customFrameworkId',
    description: 'Org-authored custom framework ID whose badge to remove',
    required: true,
  })
  async removeCustomFrameworkBadge(
    @OrganizationId() organizationId: string,
    @Query() query: RemoveCustomFrameworkBadgeQueryDto,
  ) {
    return this.trustCustomFrameworkBadgeService.removeBadge(
      organizationId,
      query.customFrameworkId,
    );
  }

  @Post('overview')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trust', 'update')
  @ApiOperation({
    summary: 'Update trust portal overview section',
  })
  // Mirrors UpdateTrustOverviewSchema plus the organizationId the handler reads
  // from the body. Without an explicit @ApiBody the generated OpenAPI spec has
  // no request body, so the MCP tool sends none, organizationId arrives
  // undefined, and assertOrganizationAccess 400s for API-key callers. (CS-752)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['organizationId'],
      properties: {
        organizationId: {
          type: 'string',
          description:
            "Organization that owns the trust portal. Must match the authenticated API key's organization.",
          example: 'org_6914cd0e16e4c7dccbb54426',
        },
        overviewTitle: { type: 'string', maxLength: 200, nullable: true },
        overviewContent: { type: 'string', maxLength: 10000, nullable: true },
        showOverview: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Overview updated successfully',
  })
  async updateOverview(
    @Body() body: UpdateTrustOverviewDto & { organizationId: string },
    @AuthContext() authContext: AuthContextType,
  ) {
    this.assertOrganizationAccess(body.organizationId, authContext);
    const dto = UpdateTrustOverviewSchema.parse(body);
    return this.trustPortalService.updateOverview(body.organizationId, dto);
  }

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trust', 'read')
  @ApiOperation({
    summary: 'Get trust portal overview',
  })
  @ApiQuery({ name: 'organizationId', required: true })
  async getOverview(
    @Query('organizationId') organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    this.assertOrganizationAccess(organizationId, authContext);
    return this.trustPortalService.getOverview(organizationId);
  }

  @Post('custom-links')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('trust', 'update')
  @ApiOperation({
    summary: 'Create a custom link for trust portal',
  })
  // Mirrors CreateCustomLinkSchema plus the organizationId the handler reads
  // from the body (see updateOverview for why the explicit body matters). (CS-752)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['organizationId', 'title', 'url'],
      properties: {
        organizationId: {
          type: 'string',
          description:
            "Organization that owns the trust portal. Must match the authenticated API key's organization.",
          example: 'org_6914cd0e16e4c7dccbb54426',
        },
        title: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', maxLength: 500, nullable: true },
        url: { type: 'string', format: 'uri', maxLength: 2000 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Custom link created successfully',
  })
  async createCustomLink(
    @Body() body: CreateCustomLinkDto & { organizationId: string },
    @AuthContext() authContext: AuthContextType,
  ) {
    this.assertOrganizationAccess(body.organizationId, authContext);
    const dto = CreateCustomLinkSchema.parse(body);
    return this.trustPortalService.createCustomLink(body.organizationId, dto);
  }

  @Post('custom-links/:linkId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trust', 'update')
  @ApiOperation({
    summary: 'Update a custom link',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Custom link updated successfully',
  })
  async updateCustomLink(
    @Param('linkId') linkId: string,
    @Body() body: UpdateCustomLinkDto,
    @AuthContext() authContext: AuthContextType,
  ) {
    const dto = UpdateCustomLinkSchema.parse(body);
    return this.trustPortalService.updateCustomLink(
      linkId,
      dto,
      authContext.organizationId,
    );
  }

  @Post('custom-links/:linkId/delete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trust', 'update')
  @ApiOperation({
    summary: 'Delete a custom link',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Custom link deleted successfully',
  })
  async deleteCustomLink(
    @Param('linkId') linkId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    return this.trustPortalService.deleteCustomLink(
      linkId,
      authContext.organizationId,
    );
  }

  @Post('custom-links/reorder')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trust', 'update')
  @ApiOperation({
    summary: 'Reorder custom links',
  })
  // Mirrors ReorderCustomLinksSchema plus the organizationId the handler reads
  // from the body (see updateOverview for why the explicit body matters). (CS-752)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['organizationId', 'linkIds'],
      properties: {
        organizationId: {
          type: 'string',
          description:
            "Organization that owns the trust portal. Must match the authenticated API key's organization.",
          example: 'org_6914cd0e16e4c7dccbb54426',
        },
        linkIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Custom link IDs in the desired display order.',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Custom links reordered successfully',
  })
  async reorderCustomLinks(
    @Body() body: ReorderCustomLinksDto & { organizationId: string },
    @AuthContext() authContext: AuthContextType,
  ) {
    this.assertOrganizationAccess(body.organizationId, authContext);
    const dto = ReorderCustomLinksSchema.parse(body);
    return this.trustPortalService.reorderCustomLinks(
      body.organizationId,
      dto.linkIds,
    );
  }

  @Get('custom-links')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trust', 'read')
  @ApiOperation({
    summary: 'List custom links for trust portal',
  })
  @ApiQuery({ name: 'organizationId', required: true })
  async listCustomLinks(
    @Query('organizationId') organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    this.assertOrganizationAccess(organizationId, authContext);
    return this.trustPortalService.listCustomLinks(organizationId);
  }

  @Post('vendors/:vendorId/trust-settings')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trust', 'update')
  @ApiOperation({
    summary: 'Update vendor trust portal settings',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor settings updated successfully',
  })
  async updateVendorTrustSettings(
    @Param('vendorId') vendorId: string,
    @Body() body: UpdateVendorTrustSettingsDto,
    @AuthContext() authContext: AuthContextType,
  ) {
    const dto = UpdateVendorTrustSettingsSchema.parse(body);
    return this.trustPortalService.updateVendorTrustSettings(
      vendorId,
      dto,
      authContext.organizationId,
    );
  }

  @Get('vendors')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('trust', 'read')
  @ApiOperation({
    summary: 'List vendors configured for trust portal',
  })
  @ApiQuery({
    name: 'all',
    required: false,
    description: 'When true, returns all org vendors with sync',
  })
  async listVendors(
    @OrganizationId() organizationId: string,
    @Query('all') all?: string,
  ) {
    if (all === 'true') {
      return this.trustPortalService.getAllVendorsWithSync(organizationId);
    }
    return this.trustPortalService.getPublicVendors(organizationId);
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
