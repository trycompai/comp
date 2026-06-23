import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { InternalTokenGuard } from '../../auth/internal-token.guard';
import { InternalIntegrationDebugService } from '../services/internal-integration-debug.service';

class RunChecksBody {
  @IsOptional()
  @IsString()
  checkId?: string;
}

/**
 * Internal-token-gated diagnostic toolkit for dynamic integrations. Lets an
 * operator/agent do the full debug loop over HTTP — inspect any connection,
 * view its credential shape (never the secret values) and recent run logs, and
 * run its checks on the real runtime — without a database tunnel and without
 * impersonating the customer's organization.
 *
 * Mutations (create/update/delete integrations + checks) and run history already
 * live on the sibling `internal/dynamic-integrations` controller; this one adds
 * the connection-scoped, org-agnostic read + on-demand run that were missing.
 *
 * A distinct base path (`internal/integration-debug`) is used deliberately so a
 * literal `connections` segment can never be swallowed by the sibling's
 * `GET /internal/dynamic-integrations/:id` param route.
 */
@ApiExcludeController()
@Controller({ path: 'internal/integration-debug', version: '1' })
@UseGuards(InternalTokenGuard)
export class InternalIntegrationDebugController {
  constructor(private readonly debugService: InternalIntegrationDebugService) {}

  /**
   * List connections (filter by org / provider / id) with a non-sensitive
   * credential view and the latest run summary for each.
   */
  @Get('connections')
  async listConnections(
    @Query('organizationId') organizationId?: string,
    @Query('providerSlug') providerSlug?: string,
    @Query('connectionId') connectionId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.debugService.listConnections({
      organizationId,
      providerSlug,
      connectionId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Full detail for one connection: credential shape + recent runs (logs +
   * results) for debugging.
   */
  @Get('connections/:connectionId')
  async getConnection(
    @Param('connectionId') connectionId: string,
    @Query('runLimit') runLimit?: string,
  ) {
    return this.debugService.getConnection(
      connectionId,
      runLimit ? parseInt(runLimit, 10) : undefined,
    );
  }

  /**
   * Run a connection's checks on the real runtime and return findings +
   * passing results + logs. Never persists — purely for verification.
   * Pass `checkId` to run a single check; omit to run all.
   */
  @Post('connections/:connectionId/run')
  async runConnectionChecks(
    @Param('connectionId') connectionId: string,
    @Body() body: RunChecksBody,
  ) {
    return this.debugService.runConnectionChecks({
      connectionId,
      checkId: body?.checkId,
    });
  }
}
