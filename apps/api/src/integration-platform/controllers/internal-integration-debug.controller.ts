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
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { InternalTokenGuard } from '../../auth/internal-token.guard';
import { InternalIntegrationDebugService } from '../services/internal-integration-debug.service';

/** Parse an optional numeric query param, dropping non-numeric input (no NaN). */
function parseOptionalInt(value?: string): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

class RunChecksBody {
  @IsOptional()
  @IsString()
  checkId?: string;
}

class TestCandidateBody {
  /** Candidate check code to run instead of the saved version. */
  @IsString()
  @IsNotEmpty()
  code!: string;

  /** Optional: the checkId this candidate is for (labelling only). */
  @IsOptional()
  @IsString()
  checkId?: string;
}

class RerunCheckBody {
  /** The check to re-run and persist. */
  @IsString()
  @IsNotEmpty()
  checkId!: string;

  /** The task this run belongs to (so task-scoped history stays correct). */
  @IsOptional()
  @IsString()
  taskId?: string;
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
      limit: parseOptionalInt(limit),
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
      parseOptionalInt(runLimit),
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

  /**
   * Run CANDIDATE check code against this connection's real credentials on the
   * real runtime, returning findings + passing results + logs. Persists nothing
   * and never touches the live shared check — the safe way to validate a fix
   * BEFORE applying it via `PATCH /internal/dynamic-integrations/:id/checks/:checkId`.
   */
  @Post('connections/:connectionId/test')
  async testCandidateCode(
    @Param('connectionId') connectionId: string,
    @Body() body: TestCandidateBody,
  ) {
    return this.debugService.testCandidateCode({
      connectionId,
      code: body.code,
      checkId: body.checkId,
    });
  }

  /**
   * Re-run a single check for one connection AND PERSIST a fresh run. Called by
   * the self-heal agent right after it applies a fix, for every connection that
   * was held — a now-fixed check produces a fresh 'success' the customer sees,
   * while one still failing our-side is re-held as 'inconclusive'. Unlike /run +
   * /test (verification-only), this writes a real IntegrationCheckRun.
   */
  @Post('connections/:connectionId/rerun')
  async rerunConnectionCheck(
    @Param('connectionId') connectionId: string,
    @Body() body: RerunCheckBody,
  ) {
    return this.debugService.rerunAndPersistCheck({
      connectionId,
      checkId: body.checkId,
      taskId: body.taskId,
    });
  }

  /**
   * Read recently captured OAuth callback errors (recorded by the frontend on a
   * failed connect). Use this to diagnose "the integration won't connect" for
   * any org/provider — the exact provider error is here instead of lost.
   */
  @Get('oauth-errors')
  async listOAuthErrors(
    @Query('organizationId') organizationId?: string,
    @Query('providerSlug') providerSlug?: string,
    @Query('limit') limit?: string,
  ) {
    return this.debugService.listOAuthErrors({
      organizationId,
      providerSlug,
      limit: parseOptionalInt(limit),
    });
  }

  /**
   * The self-heal agent's work queue: check runs HELD as inconclusive (our-side /
   * transient failures, never shown to the customer as red). The agent polls
   * this, then diagnoses + fixes each. Filter by provider / org.
   */
  @Get('inconclusive-runs')
  async listInconclusiveRuns(
    @Query('providerSlug') providerSlug?: string,
    @Query('organizationId') organizationId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.debugService.listInconclusiveRuns({
      providerSlug,
      organizationId,
      limit: parseOptionalInt(limit),
    });
  }
}
