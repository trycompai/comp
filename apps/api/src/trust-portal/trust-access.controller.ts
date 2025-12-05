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
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
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
  @UseGuards(HybridAuthGuard)
  @ApiSecurity('apikey')
  @ApiHeader({
    name: 'X-Organization-Id',
    description: 'Organization ID',
    required: true,
  })
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
  @UseGuards(HybridAuthGuard)
  @ApiSecurity('apikey')
  @ApiHeader({
    name: 'X-Organization-Id',
    description: 'Organization ID',
    required: true,
  })
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
  @UseGuards(HybridAuthGuard)
  @ApiSecurity('apikey')
  @ApiHeader({
    name: 'X-Organization-Id',
    description: 'Organization ID',
    required: true,
  })
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
  @UseGuards(HybridAuthGuard)
  @ApiSecurity('apikey')
  @ApiHeader({
    name: 'X-Organization-Id',
    description: 'Organization ID',
    required: true,
  })
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
  @UseGuards(HybridAuthGuard)
  @ApiSecurity('apikey')
  @ApiHeader({
    name: 'X-Organization-Id',
    description: 'Organization ID',
    required: true,
  })
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
  @UseGuards(HybridAuthGuard)
  @ApiSecurity('apikey')
  @ApiHeader({
    name: 'X-Organization-Id',
    description: 'Organization ID',
    required: true,
  })
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
  @UseGuards(HybridAuthGuard)
  @ApiSecurity('apikey')
  @ApiHeader({
    name: 'X-Organization-Id',
    description: 'Organization ID',
    required: true,
  })
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
  @UseGuards(HybridAuthGuard)
  @ApiSecurity('apikey')
  @ApiHeader({
    name: 'X-Organization-Id',
    description: 'Organization ID',
    required: true,
  })
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
}
