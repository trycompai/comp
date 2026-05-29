import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { UserId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { SessionOnlyGuard } from '../auth/session-only.guard';
import { SetMcpOrganizationDto } from './dto/set-mcp-organization.dto';
import { McpService } from './mcp.service';

/**
 * MCP account-management endpoints (web app only — excluded from the public
 * OpenAPI spec / MCP tools via the deny-list in public-docs-quality.ts).
 *
 * Session-only (these are user self-management actions — `SessionOnlyGuard`
 * rejects API keys / service tokens with a clean 403 instead of `@UserId()`
 * throwing a 500), and gated on app access (`app:read`) like the rest of the
 * product. Going through PermissionGuard + @RequirePermission also records the
 * PUT mutation in the audit log (the AuditLogInterceptor only logs when
 * @RequirePermission is present).
 */
@ApiTags('MCP')
@Controller({ path: 'mcp', version: '1' })
@UseGuards(HybridAuthGuard, SessionOnlyGuard, PermissionGuard)
@ApiSecurity('apikey')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Get('organization')
  @RequirePermission('app', 'read')
  @ApiOperation({
    summary: 'Get your MCP organization selection',
    description:
      'Returns the organizations you belong to and which one your AI/MCP connection currently acts on.',
  })
  async getOrganization(@UserId() userId: string) {
    return this.mcpService.getOrganizationSelection(userId);
  }

  @Put('organization')
  @RequirePermission('app', 'read')
  @ApiOperation({
    summary: 'Set your MCP organization',
    description:
      'Sets which organization your AI/MCP connection acts on when you belong to more than one. Validated against your memberships.',
  })
  @ApiBody({ type: SetMcpOrganizationDto })
  async setOrganization(
    @UserId() userId: string,
    @Body() dto: SetMcpOrganizationDto,
  ) {
    return this.mcpService.setOrganization(userId, dto.organizationId);
  }
}
