import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import type { AuthContext as AuthContextType } from '../auth/types';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { RisksService } from './risks.service';
import { RISK_OPERATIONS } from './schemas/risk-operations';
import { RISK_PARAMS } from './schemas/risk-params';
import { RISK_BODIES } from './schemas/risk-bodies';
import { GET_ALL_RISKS_RESPONSES } from './schemas/get-all-risks.responses';
import { GET_RISK_BY_ID_RESPONSES } from './schemas/get-risk-by-id.responses';
import { CREATE_RISK_RESPONSES } from './schemas/create-risk.responses';
import { UPDATE_RISK_RESPONSES } from './schemas/update-risk.responses';
import { DELETE_RISK_RESPONSES } from './schemas/delete-risk.responses';

@ApiTags('Risks')
@Controller({ path: 'risks', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Get()
  @ApiOperation(RISK_OPERATIONS.getAllRisks)
  @ApiResponse(GET_ALL_RISKS_RESPONSES[200])
  @ApiResponse(GET_ALL_RISKS_RESPONSES[401])
  @ApiResponse(GET_ALL_RISKS_RESPONSES[404])
  @ApiResponse(GET_ALL_RISKS_RESPONSES[500])
  async getAllRisks(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const risks = await this.risksService.findAllByOrganization(organizationId);

    return {
      data: risks,
      count: risks.length,
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
  @ApiOperation(RISK_OPERATIONS.getRiskById)
  @ApiParam(RISK_PARAMS.riskId)
  @ApiResponse(GET_RISK_BY_ID_RESPONSES[200])
  @ApiResponse(GET_RISK_BY_ID_RESPONSES[401])
  @ApiResponse(GET_RISK_BY_ID_RESPONSES[404])
  @ApiResponse(GET_RISK_BY_ID_RESPONSES[500])
  async getRiskById(
    @Param('id') riskId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const risk = await this.risksService.findById(riskId, organizationId);

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

  @Delete(':id')
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
