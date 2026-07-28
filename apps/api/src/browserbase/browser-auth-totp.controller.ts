import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { BrowserCredentialStorageService } from './browser-credential-storage.service';
import { SetAuthProfileTotpDto } from './dto/browserbase.dto';

/**
 * Automatic-2FA (TOTP) management for browser connections — kept in its own
 * controller so the main profiles controller stays within the file-size limit and
 * the 2FA routes are grouped. All routes share the `browserbase` v1 path prefix.
 */
@ApiTags('Browserbase')
@Controller({ path: 'browserbase', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class BrowserAuthTotpController {
  constructor(
    private readonly credentialStorageService: BrowserCredentialStorageService,
  ) {}

  // Declared before the `profiles/:profileId/...` routes so its static path is
  // never captured as a profileId.
  @Get('profiles/totp-statuses')
  @RequirePermission('integration', 'read')
  @ApiOperation({
    summary: 'Automatic-2FA status for all password connections',
    description:
      'Reports, per connection, whether an authenticator setup key is stored — so the connections list can show which sign-ins keep running unattended and which may pause. Read live from the vault in one round-trip.',
  })
  @ApiResponse({ status: 200 })
  async getOrgTotpStatuses(
    @OrganizationId() organizationId: string,
  ): Promise<{ statuses: Record<string, boolean> }> {
    const statuses =
      await this.credentialStorageService.getOrgTotpStatuses(organizationId);
    return { statuses };
  }

  @Get('profiles/:profileId/totp')
  @RequirePermission('integration', 'read')
  @ApiOperation({
    summary: 'Get automatic-2FA status for a connection',
    description:
      'Reports whether an authenticator setup key (TOTP seed) is stored for this connection, read live from the vault, so scheduled sign-ins can generate 2FA codes unattended.',
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
}
