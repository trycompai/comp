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
  RevokeGrantDto,
} from './dto/trust-access.dto';
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
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Access request created and sent for review',
  })
  async createAccessRequest(
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
    const userId = (req as any).userId;
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

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
}
