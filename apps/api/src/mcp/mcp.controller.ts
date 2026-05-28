import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { UserId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { SkipOrgCheck } from '../auth/skip-org-check.decorator';
import { SetMcpOrganizationDto } from './dto/set-mcp-organization.dto';
import { McpService } from './mcp.service';

/**
 * MCP account-management endpoints (web app only — excluded from the public
 * OpenAPI spec / MCP tools via the deny-list in public-docs-quality.ts).
 * @SkipOrgCheck because choosing among your organizations isn't scoped to one.
 */
@ApiTags('MCP')
@Controller({ path: 'mcp', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Get('organization')
  @SkipOrgCheck()
  @ApiOperation({
    summary: 'Get your MCP organization selection',
    description:
      'Returns the organizations you belong to and which one your AI/MCP connection currently acts on.',
  })
  async getOrganization(@UserId() userId: string) {
    return this.mcpService.getOrganizationSelection(userId);
  }

  @Put('organization')
  @SkipOrgCheck()
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
