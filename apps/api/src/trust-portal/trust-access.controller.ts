import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { OrganizationId } from '../auth/auth-context.decorator';
import { AuthenticatedRequest } from '../auth/types';
import {
  ApproveAccessRequestDto,
  CreateAccessRequestDto,
  DenyAccessRequestDto,
  ListAccessRequestsDto,
  ReclaimAccessDto,
  RevokeGrantDto,
} from './dto/trust-access.dto';
import { TrustFramework } from '@prisma/client';
import { SignNdaDto } from './dto/nda.dto';
import { TrustAccessService } from './trust-access.service';

@ApiTags('Trust Access')
@Controller({ path: 'trust-access', version: '1' })
export class TrustAccessController {
  constructor(private readonly trustAccessService: TrustAccessService) {}

  @Post(':friendlyUrl/requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit data access request',
    description:
      'External users submit request for data access from trust site',
  })
  @ApiParam({
    name: 'friendlyUrl',
    description: 'Trust Portal friendly URL or Organization ID',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Access request created and sent for review',
  })
  async createAccessRequest(
    // Note: friendlyUrl can be either the custom friendly URL or the organization ID
    @Param('friendlyUrl') friendlyUrl: string,
    @Body() dto: CreateAccessRequestDto,
    @Req() req: Request,
  ) {
    const ipAddress =
      (req as any).ip ?? (req as any).socket.remoteAddress ?? undefined;
    const userAgent =
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : undefined;

    return this.trustAccessService.createAccessRequest(
      friendlyUrl,
      dto,
      ipAddress,
      userAgent,
    );
  }

  @Get('admin/requests')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('trust', 'read')
  @ApiSecurity('apikey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List access requests',
    description: 'Get all access requests for organization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Access requests retrieved',
  })
  async listAccessRequests(
    @OrganizationId() organizationId: string,
    @Query() dto: ListAccessRequestsDto,
  ) {
    return this.trustAccessService.listAccessRequests(organizationId, dto);
  }

  @Get('admin/requests/:id')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('trust', 'read')
  @ApiSecurity('apikey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get access request details',
    description: 'Get detailed information about a specific access request',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request details returned',
  })
  async getAccessRequest(
    @OrganizationId() organizationId: string,
    @Param('id') requestId: string,
  ) {
    return this.trustAccessService.getAccessRequest(organizationId, requestId);
  }

  @Post('admin/requests/:id/approve')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('trust', 'update')
  @ApiSecurity('apikey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve access request',
    description: 'Approve request and create time-limited grant',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request approved successfully',
  })
  async approveRequest(
    @OrganizationId() organizationId: string,
    @Param('id') requestId: string,
    @Body() dto: ApproveAccessRequestDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).userId;
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }
    const memberId = await this.trustAccessService.getMemberIdFromUserId(
      userId,
      organizationId,
    );
    return this.trustAccessService.approveRequest(
      organizationId,
      requestId,
      dto,
      memberId,
    );
  }

  @Post('admin/requests/:id/deny')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('trust', 'update')
  @ApiSecurity('apikey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deny access request',
    description: 'Reject access request with reason',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Request denied' })
  async denyRequest(
    @OrganizationId() organizationId: string,
    @Param('id') requestId: string,
    @Body() dto: DenyAccessRequestDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).userId;
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }
    const memberId = await this.trustAccessService.getMemberIdFromUserId(
      userId,
      organizationId,
    );
    return this.trustAccessService.denyRequest(
      organizationId,
      requestId,
      dto,
      memberId,
    );
  }

  @Get('admin/grants')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('trust', 'read')
  @ApiSecurity('apikey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List access grants',
    description: 'Get all active and expired grants',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Grants retrieved' })
  async listGrants(@OrganizationId() organizationId: string) {
    return this.trustAccessService.listGrants(organizationId);
  }

  @Post('admin/grants/:id/revoke')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('trust', 'update')
  @ApiSecurity('apikey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke access grant',
    description: 'Immediately revoke active grant',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Grant revoked' })
  async revokeGrant(
    @OrganizationId() organizationId: string,
    @Param('id') grantId: string,
    @Body() dto: RevokeGrantDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).userId;
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }
    const memberId = await this.trustAccessService.getMemberIdFromUserId(
      userId,
      organizationId,
    );
    return this.trustAccessService.revokeGrant(
      organizationId,
      grantId,
      dto,
      memberId,
    );
  }

  @Post('admin/grants/:id/resend-access-email')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('trust', 'update')
  @ApiSecurity('apikey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend access granted email',
    description: 'Resend the access granted email to user with active grant',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Access email resent',
  })
  async resendAccessEmail(
    @OrganizationId() organizationId: string,
    @Param('id') grantId: string,
  ) {
    return this.trustAccessService.resendAccessGrantEmail(
      organizationId,
      grantId,
    );
  }

  @Get('nda/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get NDA details by token',
    description: 'Fetch NDA agreement details for signing',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'NDA details returned',
  })
  async getNda(@Param('token') token: string) {
    return this.trustAccessService.getNdaByToken(token);
  }

  @Post('nda/:token/preview-nda')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview NDA by token',
    description: 'Generate preview NDA PDF for external user before signing',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preview NDA generated',
  })
  async previewNdaByToken(@Param('token') token: string) {
    return this.trustAccessService.previewNdaByToken(token);
  }

  @Post('nda/:token/sign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign NDA',
    description:
      'Sign NDA agreement, generate watermarked PDF, and create access grant',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'NDA signed successfully',
  })
  async signNda(
    @Param('token') token: string,
    @Body() dto: SignNdaDto,
    @Req() req: Request,
  ) {
    if (!dto.accept) {
      throw new Error('You must accept the NDA to proceed');
    }

    const ipAddress =
      (req as any).ip ?? (req as any).socket.remoteAddress ?? undefined;
    const userAgent =
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : undefined;

    return this.trustAccessService.signNda(
      token,
      dto.name,
      dto.email,
      ipAddress,
      userAgent,
    );
  }

  @Post('admin/requests/:id/resend-nda')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('trust', 'update')
  @ApiSecurity('apikey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend NDA email',
    description: 'Resend NDA signing email to requester',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'NDA email resent',
  })
  async resendNda(
    @OrganizationId() organizationId: string,
    @Param('id') requestId: string,
  ) {
    return this.trustAccessService.resendNda(organizationId, requestId);
  }

  @Post('admin/requests/:id/preview-nda')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('trust', 'read')
  @ApiSecurity('apikey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview NDA PDF',
    description:
      'Generate preview NDA with watermark and save to S3 with preview-* prefix',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preview NDA generated',
  })
  async previewNda(
    @OrganizationId() organizationId: string,
    @Param('id') requestId: string,
  ) {
    return this.trustAccessService.previewNda(organizationId, requestId);
  }

  @Post(':friendlyUrl/reclaim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reclaim access',
    description:
      'Generate access link for users with existing grants to redownload data',
  })
  @ApiParam({
    name: 'friendlyUrl',
    description: 'Trust Portal friendly URL or Organization ID',
  })
  @ApiQuery({
    name: 'query',
    required: false,
    description:
      'Query parameter to append to the access link (e.g., security-questionnaire)',
    example: 'security-questionnaire',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Access link sent to email',
  })
  async reclaimAccess(
    // Note: friendlyUrl can be either the custom friendly URL or the organization ID
    @Param('friendlyUrl') friendlyUrl: string,
    @Body() dto: ReclaimAccessDto,
    @Query('query') query?: string,
  ) {
    return this.trustAccessService.reclaimAccess(friendlyUrl, dto.email, query);
  }

  @Get('access/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get grant data by access token',
    description: 'Retrieve compliance data using access token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grant data returned',
  })
  async getGrantByAccessToken(@Param('token') token: string) {
    return this.trustAccessService.getGrantByAccessToken(token);
  }

  @Get('access/:token/policies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List policies by access token',
    description: 'Get list of published policies available for download',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Policies list returned',
  })
  async getPoliciesByAccessToken(@Param('token') token: string) {
    return this.trustAccessService.getPoliciesByAccessToken(token);
  }

  @Get('access/:token/policies/download-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Download all policies as watermarked PDF',
    description:
      'Generate combined PDF from all published policy content with watermark',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Download URL for watermarked PDF returned',
  })
  async downloadAllPolicies(@Param('token') token: string) {
    return this.trustAccessService.downloadAllPoliciesByAccessToken(token);
  }

  @Get('access/:token/policies/download-all-zip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Download all policies as ZIP with individual PDFs',
    description:
      'Generate ZIP archive containing individual watermarked PDFs for each policy',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Download URL for ZIP archive returned',
  })
  async downloadAllPoliciesAsZip(@Param('token') token: string) {
    return this.trustAccessService.downloadAllPoliciesAsZipByAccessToken(token);
  }

  @Get('access/:token/compliance-resources')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List compliance resources by access token',
    description:
      'Get list of uploaded compliance certificates for the organization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compliance resources list returned',
  })
  async getComplianceResourcesByAccessToken(@Param('token') token: string) {
    return this.trustAccessService.getComplianceResourcesByAccessToken(token);
  }

  @Get('access/:token/documents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List additional documents by access token',
    description:
      'Get list of trust portal additional documents available for download',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Documents list returned',
  })
  async getTrustDocumentsByAccessToken(@Param('token') token: string) {
    return this.trustAccessService.getTrustDocumentsByAccessToken(token);
  }

  @Get('access/:token/documents/download-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Download all additional documents as a ZIP by access token',
    description:
      'Creates a ZIP archive of all active trust portal additional documents and returns a signed download URL',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Signed URL for ZIP archive returned',
  })
  async downloadAllTrustDocuments(@Param('token') token: string) {
    return this.trustAccessService.downloadAllTrustDocumentsByAccessToken(
      token,
    );
  }

  @Get('access/:token/documents/:documentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Download additional document by access token',
    description:
      'Get signed URL to download a specific trust portal additional document',
  })
  @ApiParam({
    name: 'documentId',
    description: 'Trust document ID',
    example: 'tdoc_abc123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Signed URL for document returned',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid access token',
  })
  async getTrustDocumentUrlByAccessToken(
    @Param('token') token: string,
    @Param('documentId') documentId: string,
  ) {
    return this.trustAccessService.getTrustDocumentUrlByAccessToken(
      token,
      documentId,
    );
  }

  @Get('access/:token/compliance-resources/:framework')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Download compliance resource by access token',
    description:
      'Get signed URL to download a specific compliance certificate file',
  })
  @ApiParam({
    name: 'framework',
    enum: Object.values(TrustFramework),
    description: 'Compliance framework identifier',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Signed URL for compliance resource returned',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Compliance resource not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid framework or access token',
  })
  async getComplianceResourceUrlByAccessToken(
    @Param('token') token: string,
    @Param('framework') framework: string,
  ) {
    return this.trustAccessService.getComplianceResourceUrlByAccessToken(
      token,
      framework as any,
    );
  }

  @Get(':friendlyUrl/faqs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get FAQs for a trust portal',
    description:
      'Retrieve the frequently asked questions for a published trust portal as structured data.',
  })
  @ApiParam({
    name: 'friendlyUrl',
    description: 'Trust Portal friendly URL or Organization ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'FAQs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        faqs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              question: { type: 'string' },
              answer: { type: 'string' },
              order: { type: 'number' },
            },
          },
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Trust site not found or not published',
  })
  async getFaqs(@Param('friendlyUrl') friendlyUrl: string) {
    return this.trustAccessService.getFaqs(friendlyUrl);
  }

  @Get(':friendlyUrl/overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get overview section for a trust portal',
    description:
      'Retrieve the overview/mission text for a published trust portal.',
  })
  @ApiParam({
    name: 'friendlyUrl',
    description: 'Trust Portal friendly URL or Organization ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Overview retrieved successfully',
  })
  async getPublicOverview(@Param('friendlyUrl') friendlyUrl: string) {
    return this.trustAccessService.getPublicOverview(friendlyUrl);
  }

  @Get(':friendlyUrl/custom-links')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get custom links for a trust portal',
    description:
      'Retrieve the custom external links configured for the trust portal.',
  })
  @ApiParam({
    name: 'friendlyUrl',
    description: 'Trust Portal friendly URL or Organization ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Custom links retrieved successfully',
  })
  async getPublicCustomLinks(@Param('friendlyUrl') friendlyUrl: string) {
    return this.trustAccessService.getPublicCustomLinks(friendlyUrl);
  }

  @Get(':friendlyUrl/favicon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get favicon URL for a trust portal',
    description: 'Retrieve the favicon URL for the trust portal.',
  })
  @ApiParam({
    name: 'friendlyUrl',
    description: 'Trust Portal friendly URL or Organization ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Favicon URL retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        faviconUrl: {
          type: 'string',
          nullable: true,
          description: 'Signed URL to the favicon, or null if not set',
        },
      },
    },
  })
  async getPublicFavicon(@Param('friendlyUrl') friendlyUrl: string) {
    const faviconUrl =
      await this.trustAccessService.getPublicFavicon(friendlyUrl);
    return { faviconUrl };
  }

  @Get(':friendlyUrl/vendors')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get vendors/subprocessors for a trust portal',
    description:
      'Retrieve the list of vendors configured to display on the trust portal.',
  })
  @ApiParam({
    name: 'friendlyUrl',
    description: 'Trust Portal friendly URL or Organization ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendors retrieved successfully',
  })
  async getPublicVendors(@Param('friendlyUrl') friendlyUrl: string) {
    return this.trustAccessService.getPublicVendors(friendlyUrl);
  }
}
