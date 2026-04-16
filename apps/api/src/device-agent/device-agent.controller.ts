import {
  Body,
  Controller,
  Get,
  Head,
  Param,
  Post,
  Query,
  Req,
  Response,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthContext,
  OrganizationId,
  UserId,
} from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { Public } from '../auth/public.decorator';
import { RequirePermission } from '../auth/require-permission.decorator';
import { SkipOrgCheck } from '../auth/skip-org-check.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { DeviceAgentAuthService } from './device-agent-auth.service';
import { DeviceAgentService } from './device-agent.service';
import { AuthCodeDto } from './dto/auth-code.dto';
import { CheckInDto } from './dto/check-in.dto';
import { ExchangeCodeDto } from './dto/exchange-code.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { DEVICE_AGENT_OPERATIONS } from './schemas/device-agent-operations';
import { DOWNLOAD_MAC_AGENT_RESPONSES } from './schemas/download-mac-agent.responses';
import { DOWNLOAD_WINDOWS_AGENT_RESPONSES } from './schemas/download-windows-agent.responses';
import type { Response as ExpressResponse } from 'express';
import type { Request as ExpressRequest } from 'express';

@ApiTags('Device Agent')
@Controller({ path: 'device-agent', version: '1' })
export class DeviceAgentController {
  constructor(
    private readonly deviceAgentService: DeviceAgentService,
    private readonly deviceAgentAuthService: DeviceAgentAuthService,
  ) {}

  // --- Public endpoints (no auth) ---

  @Post('exchange-code')
  @Public()
  async exchangeCode(@Body() dto: ExchangeCodeDto) {
    return this.deviceAgentAuthService.exchangeCode({ code: dto.code });
  }

  @Get('updates/:filename')
  @Public()
  async getUpdateFile(
    @Param('filename') filename: string,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.deviceAgentService.getUpdateFile({ filename });

    res.set({
      'Content-Type': result.contentType,
      'Cache-Control': 'public, max-age=300',
      ...(result.contentLength
        ? { 'Content-Length': result.contentLength.toString() }
        : {}),
    });

    return new StreamableFile(result.stream);
  }

  @Head('updates/:filename')
  @Public()
  async headUpdateFile(
    @Param('filename') filename: string,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.deviceAgentService.headUpdateFile({ filename });

    res.set({
      'Content-Type': result.contentType,
      'Cache-Control': 'public, max-age=300',
      ...(result.contentLength
        ? { 'Content-Length': result.contentLength.toString() }
        : {}),
    });

    return '';
  }

  // --- Session-only endpoints (no org check) ---

  @Post('auth-code')
  @UseGuards(HybridAuthGuard)
  @SkipOrgCheck()
  async generateAuthCode(@Req() req: ExpressRequest, @Body() dto: AuthCodeDto) {
    // Construct Web API Headers from Express IncomingHttpHeaders
    const headers = new Headers();
    const authHeader = req.headers['authorization'];
    if (authHeader) headers.set('authorization', authHeader);
    const cookieHeader = req.headers['cookie'];
    if (cookieHeader) headers.set('cookie', cookieHeader);

    return this.deviceAgentAuthService.generateAuthCode({
      headers,
      state: dto.state,
    });
  }

  @Get('my-organizations')
  @UseGuards(HybridAuthGuard)
  @SkipOrgCheck()
  async getMyOrganizations(@UserId() userId: string) {
    return this.deviceAgentAuthService.getMyOrganizations({ userId });
  }

  @Post('register')
  @UseGuards(HybridAuthGuard)
  @SkipOrgCheck()
  async registerDevice(
    @UserId() userId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.deviceAgentAuthService.registerDevice({ userId, dto });
  }

  @Post('check-in')
  @UseGuards(HybridAuthGuard)
  @SkipOrgCheck()
  async checkIn(@UserId() userId: string, @Body() dto: CheckInDto) {
    return this.deviceAgentAuthService.checkIn({ userId, dto });
  }

  @Get('status')
  @UseGuards(HybridAuthGuard)
  @SkipOrgCheck()
  async getDeviceStatus(
    @UserId() userId: string,
    @Query('deviceId') deviceId?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.deviceAgentAuthService.getDeviceStatus({
      userId,
      deviceId,
      organizationId,
    });
  }

  // --- RBAC-protected endpoints (existing) ---

  @Get('mac')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('app', 'read')
  @ApiSecurity('apikey')
  @ApiOperation(DEVICE_AGENT_OPERATIONS.downloadMacAgent)
  @ApiResponse(DOWNLOAD_MAC_AGENT_RESPONSES[200])
  @ApiResponse(DOWNLOAD_MAC_AGENT_RESPONSES[401])
  @ApiResponse(DOWNLOAD_MAC_AGENT_RESPONSES[404])
  @ApiResponse(DOWNLOAD_MAC_AGENT_RESPONSES[500])
  async downloadMacAgent(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const { stream, filename, contentType } =
      await this.deviceAgentService.downloadMacAgent();

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    return new StreamableFile(stream);
  }

  @Get('windows')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('app', 'read')
  @ApiSecurity('apikey')
  @ApiOperation(DEVICE_AGENT_OPERATIONS.downloadWindowsAgent)
  @ApiResponse(DOWNLOAD_WINDOWS_AGENT_RESPONSES[200])
  @ApiResponse(DOWNLOAD_WINDOWS_AGENT_RESPONSES[401])
  @ApiResponse(DOWNLOAD_WINDOWS_AGENT_RESPONSES[404])
  @ApiResponse(DOWNLOAD_WINDOWS_AGENT_RESPONSES[500])
  async downloadWindowsAgent(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const { stream, filename, contentType } =
      await this.deviceAgentService.downloadWindowsAgent();

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    return new StreamableFile(stream);
  }
}
