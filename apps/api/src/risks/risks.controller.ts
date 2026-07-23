import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
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
import {
  buildRiskAssignmentFilter,
  hasRiskAccess,
} from '../utils/assignment-filter';
import { CreateRiskAcceptanceDto } from './dto/create-risk-acceptance.dto';
import { CreateRiskDto } from './dto/create-risk.dto';
import { GetRisksQueryDto } from './dto/get-risks-query.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { RiskAcceptancesService } from './risk-acceptances.service';
import { RisksService } from './risks.service';
import { RISK_OPERATIONS } from './schemas/risk-operations';
import { RISK_PARAMS } from './schemas/risk-params';
import { RISK_BODIES } from './schemas/risk-bodies';
import { GET_ALL_RISKS_RESPONSES } from './schemas/get-all-risks.responses';
import { GET_RISK_BY_ID_RESPONSES } from './schemas/get-risk-by-id.responses';
import { CREATE_RISK_RESPONSES } from './schemas/create-risk.responses';
import { UPDATE_RISK_RESPONSES } from './schemas/update-risk.responses';
import { DELETE_RISK_RESPONSES } from './schemas/delete-risk.responses';
import {
  LIST_RISK_ACCEPTANCES_RESPONSES,
  RECORD_RISK_ACCEPTANCE_RESPONSES,
} from './schemas/risk-acceptances.responses';

@ApiTags('Risks')
@Controller({ path: 'risks', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
export class RisksController {
  constructor(
    private readonly risksService: RisksService,
    private readonly riskAcceptancesService: RiskAcceptancesService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission('risk', 'read')
  @ApiOperation(RISK_OPERATIONS.getAllRisks)
  @ApiResponse(GET_ALL_RISKS_RESPONSES[200])
  @ApiResponse(GET_ALL_RISKS_RESPONSES[401])
  @ApiResponse(GET_ALL_RISKS_RESPONSES[404])
  @ApiResponse(GET_ALL_RISKS_RESPONSES[500])
  async getAllRisks(
    @Query() query: GetRisksQueryDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    // Build assignment filter for restricted roles (employee/contractor)
    const assignmentFilter = buildRiskAssignmentFilter(
      authContext.memberId,
      authContext.userRoles,
      { isApiKey: authContext.isApiKey },
    );

    const result = await this.risksService.findAllByOrganization(
      organizationId,
      assignmentFilter,
      query,
    );

    return {
      data: result.data,
      totalCount: result.totalCount,
      page: result.page,
      pageCount: result.pageCount,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Get('stats/by-assignee')
  @UseGuards(PermissionGuard)
  @RequirePermission('risk', 'read')
  @ApiOperation({ summary: 'Get risk statistics grouped by assignee' })
  async getStatsByAssignee(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.risksService.getStatsByAssignee(organizationId);

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Get('stats/by-department')
  @UseGuards(PermissionGuard)
  @RequirePermission('risk', 'read')
  @ApiOperation({ summary: 'Get risk counts grouped by department' })
  async getStatsByDepartment(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.risksService.getStatsByDepartment(organizationId);

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('risk', 'read')
  @ApiOperation(RISK_OPERATIONS.getRiskById)
  @ApiParam(RISK_PARAMS.riskId)
  @ApiResponse(GET_RISK_BY_ID_RESPONSES[200])
  @ApiResponse(GET_RISK_BY_ID_RESPONSES[401])
  @ApiResponse(GET_RISK_BY_ID_RESPONSES[403])
  @ApiResponse(GET_RISK_BY_ID_RESPONSES[404])
  @ApiResponse(GET_RISK_BY_ID_RESPONSES[500])
  async getRiskById(
    @Param('id') riskId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const risk = await this.risksService.findById(riskId, organizationId);

    // Check assignment access for restricted roles
    if (
      !hasRiskAccess(risk, authContext.memberId, authContext.userRoles, {
        isApiKey: authContext.isApiKey,
      })
    ) {
      throw new ForbiddenException('You do not have access to this risk');
    }

    return {
      ...risk,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission('risk', 'create')
  @ApiOperation(RISK_OPERATIONS.createRisk)
  @ApiBody(RISK_BODIES.createRisk)
  @ApiResponse(CREATE_RISK_RESPONSES[201])
  @ApiResponse(CREATE_RISK_RESPONSES[400])
  @ApiResponse(CREATE_RISK_RESPONSES[401])
  @ApiResponse(CREATE_RISK_RESPONSES[404])
  @ApiResponse(CREATE_RISK_RESPONSES[500])
  async createRisk(
    @Body() createRiskDto: CreateRiskDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const risk = await this.risksService.create(organizationId, createRiskDto);

    return {
      ...risk,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('risk', 'update')
  @ApiOperation(RISK_OPERATIONS.updateRisk)
  @ApiParam(RISK_PARAMS.riskId)
  @ApiBody(RISK_BODIES.updateRisk)
  @ApiResponse(UPDATE_RISK_RESPONSES[200])
  @ApiResponse(UPDATE_RISK_RESPONSES[400])
  @ApiResponse(UPDATE_RISK_RESPONSES[401])
  @ApiResponse(UPDATE_RISK_RESPONSES[404])
  @ApiResponse(UPDATE_RISK_RESPONSES[500])
  async updateRisk(
    @Param('id') riskId: string,
    @Body() updateRiskDto: UpdateRiskDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const updatedRisk = await this.risksService.updateById(
      riskId,
      organizationId,
      updateRiskDto,
    );

    return {
      ...updatedRisk,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Get(':id/acceptances')
  @UseGuards(PermissionGuard)
  @RequirePermission('risk', 'read')
  @ApiOperation(RISK_OPERATIONS.listRiskAcceptances)
  @ApiParam(RISK_PARAMS.riskId)
  @ApiResponse(LIST_RISK_ACCEPTANCES_RESPONSES[200])
  @ApiResponse(LIST_RISK_ACCEPTANCES_RESPONSES[401])
  @ApiResponse(LIST_RISK_ACCEPTANCES_RESPONSES[404])
  async listRiskAcceptances(
    @Param('id') riskId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const { risk, acceptances } = await this.riskAcceptancesService.listForRisk(
      riskId,
      organizationId,
    );

    // Same assignment-access rule as GET /risks/:id for restricted roles.
    if (
      !hasRiskAccess(risk, authContext.memberId, authContext.userRoles, {
        isApiKey: authContext.isApiKey,
      })
    ) {
      throw new ForbiddenException('You do not have access to this risk');
    }

    return {
      data: acceptances,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
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
  @ApiResponse(RECORD_RISK_ACCEPTANCE_RESPONSES[404])
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
    );

    return {
      ...acceptance,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('risk', 'delete')
  @ApiOperation(RISK_OPERATIONS.deleteRisk)
  @ApiParam(RISK_PARAMS.riskId)
  @ApiResponse(DELETE_RISK_RESPONSES[200])
  @ApiResponse(DELETE_RISK_RESPONSES[401])
  @ApiResponse(DELETE_RISK_RESPONSES[404])
  @ApiResponse(DELETE_RISK_RESPONSES[500])
  async deleteRisk(
    @Param('id') riskId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result = await this.risksService.deleteById(riskId, organizationId);

    return {
      ...result,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }
}
