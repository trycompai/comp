import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { UserId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { SetMcpOrganizationDto } from './dto/set-mcp-organization.dto';
import { McpService } from './mcp.service';

/**
 * MCP account-management endpoints (web app only — excluded from the public
 * OpenAPI spec / MCP tools via the deny-list in public-docs-quality.ts).
 *
 * Gated on app access (`app:read`) like the rest of the product: only roles that
 * can use the app may manage its MCP settings. Going through PermissionGuard +
 * @RequirePermission also enforces API-key scopes and records the mutation in
 * the audit log (the AuditLogInterceptor only logs when @RequirePermission is
 * present).
 */
@ApiTags('MCP')
@Controller({ path: 'mcp', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
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
