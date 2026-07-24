import {
  Body,
  Controller,
  ForbiddenException,
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
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { hasRiskAccess } from '../utils/assignment-filter';
import { CreateRiskAcceptanceDto } from './dto/create-risk-acceptance.dto';
import { RiskAcceptancesService } from './risk-acceptances.service';
import { RISK_OPERATIONS } from './schemas/risk-operations';
import { RISK_PARAMS } from './schemas/risk-params';
import { RISK_BODIES } from './schemas/risk-bodies';
import {
  LIST_RISK_ACCEPTANCES_RESPONSES,
  RECORD_RISK_ACCEPTANCE_RESPONSES,
} from './schemas/risk-acceptances.responses';

/**
 * Residual-risk acceptance events for risks (ISO 27001 6.1.3(f), CS-727).
 * Append-only: list + record, no update/delete. Restricted roles get the same
 * assignment-access rule as GET /risks/:id on BOTH endpoints — an acceptance
 * is the risk owner's formal statement, so members who cannot see a risk must
 * not be able to read or write its acceptance trail.
 */
@ApiTags('Risks')
@Controller({ path: 'risks', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
export class RiskAcceptancesController {
  constructor(
    private readonly riskAcceptancesService: RiskAcceptancesService,
  ) {}

  @Get(':id/acceptances')
  @UseGuards(PermissionGuard)
  @RequirePermission('risk', 'read')
  @ApiOperation(RISK_OPERATIONS.listRiskAcceptances)
  @ApiParam(RISK_PARAMS.riskId)
  @ApiResponse(LIST_RISK_ACCEPTANCES_RESPONSES[200])
  @ApiResponse(LIST_RISK_ACCEPTANCES_RESPONSES[401])
  @ApiResponse(LIST_RISK_ACCEPTANCES_RESPONSES[403])
  @ApiResponse(LIST_RISK_ACCEPTANCES_RESPONSES[404])
  @ApiResponse(LIST_RISK_ACCEPTANCES_RESPONSES[500])
  async listRiskAcceptances(
    @Param('id') riskId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const { risk, acceptances } = await this.riskAcceptancesService.listForRisk(
      riskId,
      organizationId,
    );
    this.assertRiskAccess(risk, authContext);

    return {
      data: acceptances,
      authType: authContext.authType,
      ...this.authenticatedUser(authContext),
    };
  }

  @Post(':id/acceptances')
  @UseGuards(PermissionGuard)
  @RequirePermission('risk', 'update')
  @ApiOperation(RISK_OPERATIONS.recordRiskAcceptance)
  @ApiParam(RISK_PARAMS.riskId)
  @ApiBody(RISK_BODIES.recordRiskAcceptance)
  @ApiResponse(RECORD_RISK_ACCEPTANCE_RESPONSES[201])
  @ApiResponse(RECORD_RISK_ACCEPTANCE_RESPONSES[400])
  @ApiResponse(RECORD_RISK_ACCEPTANCE_RESPONSES[401])
  @ApiResponse(RECORD_RISK_ACCEPTANCE_RESPONSES[403])
  @ApiResponse(RECORD_RISK_ACCEPTANCE_RESPONSES[404])
  @ApiResponse(RECORD_RISK_ACCEPTANCE_RESPONSES[500])
  async recordRiskAcceptance(
    @Param('id') riskId: string,
    @Body() dto: CreateRiskAcceptanceDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const acceptance = await this.riskAcceptancesService.createForRisk(
      riskId,
      organizationId,
      dto,
      // Assignment gate for restricted roles, applied inside the create load
      // so an unassigned restricted member can neither read nor record.
      (risk) => this.assertRiskAccess(risk, authContext),
    );

    return {
      ...acceptance,
      authType: authContext.authType,
      ...this.authenticatedUser(authContext),
    };
  }

  private assertRiskAccess(
    risk: { assigneeId: string | null },
    authContext: AuthContextType,
  ) {
    if (
      !hasRiskAccess(risk, authContext.memberId, authContext.userRoles, {
        isApiKey: authContext.isApiKey,
      })
    ) {
      throw new ForbiddenException('You do not have access to this risk');
    }
  }

  private authenticatedUser(authContext: AuthContextType) {
    return authContext.userId && authContext.userEmail
      ? {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }
      : {};
  }
}
