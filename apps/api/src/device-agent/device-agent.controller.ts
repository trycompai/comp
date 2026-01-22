import {
  Controller,
  Get,
  UseGuards,
  StreamableFile,
  Response,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import type { AuthContext as AuthContextType } from '../auth/types';
import { DeviceAgentService } from './device-agent.service';
import { DEVICE_AGENT_OPERATIONS } from './schemas/device-agent-operations';
import { DOWNLOAD_MAC_AGENT_RESPONSES } from './schemas/download-mac-agent.responses';
import { DOWNLOAD_WINDOWS_AGENT_RESPONSES } from './schemas/download-windows-agent.responses';
import type { Response as ExpressResponse } from 'express';

@ApiTags('Device Agent')
@Controller({ path: 'device-agent', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class DeviceAgentController {
  constructor(private readonly deviceAgentService: DeviceAgentService) {}

  @Get('mac')
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

    // Set headers for file download
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

    // Set headers for file download
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
