import { Controller, Get, Param, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { McpDownloadService } from './mcp-download.service';

/**
 * Stable, never-stale download links for the MCP server artifacts.
 *
 * The `.mcpb` and the platform binaries are published as assets on the MCP
 * release stream (`apps/mcp-server/vX.Y.Z`), which is buried among the frequent
 * product releases — so a version-pinned link in the docs rots every release and
 * is hard for customers to find. These endpoints 302-redirect to the asset on
 * whatever the latest MCP release is, so the docs can link here once and forget.
 *
 * Public + unversioned on purpose (customer-facing download URLs). Excluded from
 * the OpenAPI spec so it never becomes an MCP tool or a docs entry.
 */
@ApiExcludeController()
@Controller({ path: 'mcp/download', version: VERSION_NEUTRAL })
export class McpDownloadController {
  constructor(private readonly mcpDownloadService: McpDownloadService) {}

  @Get(':target')
  @Public()
  async download(
    @Param('target') target: string,
    @Res() res: Response,
  ): Promise<void> {
    const url = await this.mcpDownloadService.resolveDownloadUrl(target);
    res.redirect(302, url);
  }
}
