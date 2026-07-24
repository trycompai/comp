import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { BrowserCredentialStorageService } from './browser-credential-storage.service';
import {
  BrowserMfaInstructionsService,
  type MfaInstructions,
} from './browser-mfa-instructions.service';
import { BrowserbaseService } from './browserbase.service';
import {
  BrowserAuthProfileResponseDto,
  MarkAuthProfileNeedsReauthDto,
  ResolveAuthProfileDto,
  ResolveAuthProfileResponseDto,
  SessionResponseDto,
  SetAuthProfileTotpDto,
  SignInAuthProfileDto,
  SignInAuthProfileResponseDto,
  StoreAuthProfileCredentialsDto,
  UpdateAuthProfileDto,
  VerifyAuthProfileResponseDto,
  VerifyAuthProfileSessionDto,
} from './dto/browserbase.dto';

@ApiTags('Browserbase')
@Controller({ path: 'browserbase', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class BrowserAuthProfilesController {
  constructor(
    private readonly browserbaseService: BrowserbaseService,
    private readonly mfaInstructionsService: BrowserMfaInstructionsService,
    private readonly credentialStorageService: BrowserCredentialStorageService,
  ) {}

  @Get('mfa-instructions')
  @RequirePermission('integration', 'read')
  @ApiOperation({
    summary: 'Get authenticator (2FA) setup instructions for a vendor',
    description:
      'Returns per-vendor, human-readable steps for finding the authenticator "setup key" (TOTP seed) so a user can enable unattended 2FA. Steps are AI-generated (no per-vendor hardcode), confidence-gated to a universal fallback, and cached per hostname.',
  })
  @ApiQuery({
    name: 'host',
    description: 'The vendor sign-in URL or hostname (e.g. github.com).',
  })
  @ApiResponse({ status: 200 })
  async getMfaInstructions(
    @Query('host') host?: string,
  ): Promise<MfaInstructions> {
    if (!host?.trim()) {
      throw new BadRequestException('host query parameter is required');
    }
    return this.mfaInstructionsService.getInstructions(host.trim());
  }

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

  @Get('profiles/:profileId/totp')
  @RequirePermission('integration', 'read')
  @ApiOperation({
    summary: 'Get automatic-2FA status for a connection',
    description:
      "Reports whether an authenticator setup key (TOTP seed) is stored for this connection, read live from the vault, so scheduled sign-ins can generate 2FA codes unattended.",
  })
  @ApiParam({ name: 'profileId', description: 'Browser auth profile ID' })
  @ApiResponse({ status: 200 })
  async getProfileTotp(
    @OrganizationId() organizationId: string,
    @Param('profileId') profileId: string,
  ): Promise<{ configured: boolean }> {
    return this.credentialStorageService.getProfileTotpStatus({
      organizationId,
      profileId,
    });
  }

  @Post('profiles/:profileId/totp')
  @RequirePermission('integration', 'update')
  @ApiOperation({
    summary: 'Store an authenticator setup key for a connection',
    description:
      "Attach or replace the authenticator setup key (TOTP seed) on this connection's stored login, enabling unattended 2FA. Does not require re-entering the username or password.",
  })
  @ApiParam({ name: 'profileId', description: 'Browser auth profile ID' })
  @ApiBody({ type: SetAuthProfileTotpDto })
  @ApiResponse({ status: 201 })
  async setProfileTotp(
    @OrganizationId() organizationId: string,
    @Param('profileId') profileId: string,
    @Body() dto: SetAuthProfileTotpDto,
  ): Promise<{ configured: boolean }> {
    return this.credentialStorageService.setProfileTotp({
      organizationId,
      profileId,
      totpSeed: dto.totpSeed,
    });
  }

  @Delete('profiles/:profileId/totp')
  @RequirePermission('integration', 'update')
  @ApiOperation({
    summary: 'Turn off automatic 2FA for a connection',
    description:
      'Remove the stored authenticator setup key. Scheduled runs pause if the vendor then asks for a code.',
  })
  @ApiParam({ name: 'profileId', description: 'Browser auth profile ID' })
  @ApiResponse({ status: 200 })
  async clearProfileTotp(
    @OrganizationId() organizationId: string,
    @Param('profileId') profileId: string,
  ): Promise<{ configured: boolean }> {
    return this.credentialStorageService.clearProfileTotp({
      organizationId,
      profileId,
    });
  }

  @Post('profiles/:profileId/sign-in')
  @RequirePermission('integration', 'update')
  @ApiOperation({
    summary: 'Automated sign-in for a browser auth profile',
    description:
      'Starts a background run that signs in to the vendor using the credentials stored for this profile, so the user does not have to type them into the browser. Returns a run handle to subscribe to; if the automated sign-in cannot complete (CAPTCHA, email/SMS code, SSO), the connect flow falls back to a live browser.',
  })
  @ApiParam({ name: 'profileId', description: 'Browser auth profile ID' })
  @ApiBody({ type: SignInAuthProfileDto })
  @ApiResponse({ status: 201, type: SignInAuthProfileResponseDto })
  async signInProfile(
    @OrganizationId() organizationId: string,
    @Param('profileId') profileId: string,
    @Body() dto: SignInAuthProfileDto,
  ): Promise<SignInAuthProfileResponseDto> {
    return this.browserbaseService.signInAuthProfile({
      organizationId,
      profileId,
      url: dto.url,
      mode: dto.mode,
      usernameLabel: dto.usernameLabel,
    });
  }

  @Patch('profiles/:profileId')
  @RequirePermission('integration', 'update')
  @ApiOperation({
    summary: 'Update a browser auth profile',
    description:
      'Edit a connection’s display name and/or sign-in URL. Changing to a different hostname marks the connection as needing reconnection.',
  })
  @ApiParam({ name: 'profileId', description: 'Browser auth profile ID' })
  @ApiBody({ type: UpdateAuthProfileDto })
  @ApiResponse({ status: 200, type: BrowserAuthProfileResponseDto })
  async updateProfile(
    @OrganizationId() organizationId: string,
    @Param('profileId') profileId: string,
    @Body() dto: UpdateAuthProfileDto,
  ): Promise<BrowserAuthProfileResponseDto> {
    return (await this.browserbaseService.updateAuthProfile({
      organizationId,
      profileId,
      displayName: dto.displayName,
      url: dto.url,
    })) as BrowserAuthProfileResponseDto;
  }

  @Delete('profiles/:profileId')
  @RequirePermission('integration', 'delete')
  @ApiOperation({
    summary: 'Remove a browser auth profile',
    description:
      'Delete a connection and best-effort remove its stored login from the vault. Automations that relied on it stop running until reconnected.',
  })
  @ApiParam({ name: 'profileId', description: 'Browser auth profile ID' })
  @ApiResponse({ status: 200 })
  async deleteProfile(
    @OrganizationId() organizationId: string,
    @Param('profileId') profileId: string,
  ): Promise<{ success: boolean }> {
    const result = await this.browserbaseService.deleteAuthProfile({
      organizationId,
      profileId,
    });
    return { success: result.success };
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
