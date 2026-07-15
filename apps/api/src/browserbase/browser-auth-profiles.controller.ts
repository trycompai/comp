import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { BrowserbaseService } from './browserbase.service';
import {
  BrowserAuthProfileResponseDto,
  MarkAuthProfileNeedsReauthDto,
  ResolveAuthProfileDto,
  ResolveAuthProfileResponseDto,
  SessionResponseDto,
  StoreAuthProfileCredentialsDto,
  VerifyAuthProfileResponseDto,
  VerifyAuthProfileSessionDto,
} from './dto/browserbase.dto';

@ApiTags('Browserbase')
@Controller({ path: 'browserbase', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class BrowserAuthProfilesController {
  constructor(private readonly browserbaseService: BrowserbaseService) {}

  @Get('profiles')
  @RequirePermission('integration', 'read')
  @ApiOperation({
    summary: 'List browser auth profiles',
    description:
      'List per-site browser auth profiles for the organization, including hostname, verification status, and vault metadata references.',
  })
  @ApiResponse({
    status: 200,
    type: [BrowserAuthProfileResponseDto],
  })
  async listProfiles(
    @OrganizationId() organizationId: string,
  ): Promise<BrowserAuthProfileResponseDto[]> {
    return (await this.browserbaseService.listAuthProfiles(
      organizationId,
    )) as BrowserAuthProfileResponseDto[];
  }

  @Post('profiles/resolve')
  @RequirePermission('integration', 'create')
  @ApiOperation({
    summary: 'Create or get browser auth profile',
    description:
      'Normalize a website URL to a hostname and create or reuse the matching browser auth profile for that org and login identity.',
  })
  @ApiBody({ type: ResolveAuthProfileDto })
  @ApiResponse({
    status: 201,
    type: ResolveAuthProfileResponseDto,
  })
  async resolveProfile(
    @OrganizationId() organizationId: string,
    @Body() dto: ResolveAuthProfileDto,
  ): Promise<ResolveAuthProfileResponseDto> {
    return (await this.browserbaseService.getOrCreateAuthProfile({
      organizationId,
      ...dto,
    })) as ResolveAuthProfileResponseDto;
  }

  @Post('profiles/:profileId/session')
  @RequirePermission('integration', 'read')
  @ApiOperation({
    summary: 'Start browser auth profile session',
    description:
      'Create a Browserbase Live View session using a specific auth profile context so a user can log in or complete 2FA manually.',
  })
  @ApiParam({ name: 'profileId', description: 'Browser auth profile ID' })
  @ApiResponse({ status: 201, type: SessionResponseDto })
  async startProfileSession(
    @OrganizationId() organizationId: string,
    @Param('profileId') profileId: string,
  ): Promise<SessionResponseDto> {
    return await this.browserbaseService.startAuthProfileSession({
      organizationId,
      profileId,
    });
  }

  @Post('profiles/:profileId/verify')
  @RequirePermission('integration', 'update')
  @ApiOperation({
    summary: 'Verify browser auth profile session',
    description:
      'Check whether the Live View session is authenticated for the profile URL and update the profile status to verified or needs reauth.',
  })
  @ApiParam({ name: 'profileId', description: 'Browser auth profile ID' })
  @ApiBody({ type: VerifyAuthProfileSessionDto })
  @ApiResponse({ status: 200, type: VerifyAuthProfileResponseDto })
  async verifyProfileSession(
    @OrganizationId() organizationId: string,
    @Param('profileId') profileId: string,
    @Body() dto: VerifyAuthProfileSessionDto,
  ): Promise<VerifyAuthProfileResponseDto> {
    return (await this.browserbaseService.verifyAuthProfileSession({
      organizationId,
      profileId,
      sessionId: dto.sessionId,
      url: dto.url,
    })) as VerifyAuthProfileResponseDto;
  }

  @Post('profiles/:profileId/credentials')
  @RequirePermission('integration', 'update')
  @ApiOperation({
    summary: 'Store browser auth profile credentials',
    description:
      'Store the login (username, password, optional authenticator setup key) for a browser auth profile in the organization vault so scheduled and manual runs can sign in automatically when a session expires.',
  })
  @ApiParam({ name: 'profileId', description: 'Browser auth profile ID' })
  @ApiBody({ type: StoreAuthProfileCredentialsDto })
  @ApiResponse({ status: 200, type: BrowserAuthProfileResponseDto })
  async storeProfileCredentials(
    @OrganizationId() organizationId: string,
    @Param('profileId') profileId: string,
    @Body() dto: StoreAuthProfileCredentialsDto,
  ): Promise<BrowserAuthProfileResponseDto> {
    return (await this.browserbaseService.storeAuthProfileCredentials({
      organizationId,
      profileId,
      username: dto.username,
      password: dto.password,
      totpSeed: dto.totpSeed,
      extraFields: dto.extraFields,
    })) as BrowserAuthProfileResponseDto;
  }

  @Post('profiles/:profileId/needs-reauth')
  @RequirePermission('integration', 'update')
  @ApiOperation({
    summary: 'Mark browser auth profile needs reauth',
    description:
      'Mark a browser auth profile as needing user reauthentication without storing any raw credentials or TOTP secrets.',
  })
  @ApiParam({ name: 'profileId', description: 'Browser auth profile ID' })
  @ApiBody({ type: MarkAuthProfileNeedsReauthDto })
  @ApiResponse({ status: 200, type: BrowserAuthProfileResponseDto })
  async markNeedsReauth(
    @OrganizationId() organizationId: string,
    @Param('profileId') profileId: string,
    @Body() dto: MarkAuthProfileNeedsReauthDto,
  ): Promise<BrowserAuthProfileResponseDto> {
    return (await this.browserbaseService.markAuthProfileNeedsReauth({
      organizationId,
      profileId,
      reason: dto.reason,
    })) as BrowserAuthProfileResponseDto;
  }
}
