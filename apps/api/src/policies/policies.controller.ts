import { 
  Body, 
  Controller, 
  Delete, 
  Get, 
  Param, 
  Patch, 
  Post, 
  UseGuards 
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
import {
  AuthContext,
  OrganizationId,
} from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import type { AuthContext as AuthContextType } from '../auth/types';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PoliciesService } from './policies.service';
import { GET_ALL_POLICIES_RESPONSES } from './schemas/get-all-policies.responses';
import { GET_POLICY_BY_ID_RESPONSES } from './schemas/get-policy-by-id.responses';
import { CREATE_POLICY_RESPONSES } from './schemas/create-policy.responses';
import { UPDATE_POLICY_RESPONSES } from './schemas/update-policy.responses';
import { DELETE_POLICY_RESPONSES } from './schemas/delete-policy.responses';
import { POLICY_OPERATIONS } from './schemas/policy-operations';
import { POLICY_PARAMS } from './schemas/policy-params';
import { POLICY_BODIES } from './schemas/policy-bodies';

@ApiTags('Policies')
@Controller({ path: 'policies', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  @ApiOperation(POLICY_OPERATIONS.getAllPolicies)
  @ApiResponse(GET_ALL_POLICIES_RESPONSES[200])
  @ApiResponse(GET_ALL_POLICIES_RESPONSES[401])
  async getAllPolicies(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const policies = await this.policiesService.findAll(organizationId);

    return {
      data: policies,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Get(':id')
  @ApiOperation(POLICY_OPERATIONS.getPolicyById)
  @ApiParam(POLICY_PARAMS.policyId)
  @ApiResponse(GET_POLICY_BY_ID_RESPONSES[200])
  @ApiResponse(GET_POLICY_BY_ID_RESPONSES[401])
  @ApiResponse(GET_POLICY_BY_ID_RESPONSES[404])
  async getPolicy(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const policy = await this.policiesService.findById(id, organizationId);

    return {
      ...policy,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post()
  @ApiOperation(POLICY_OPERATIONS.createPolicy)
  @ApiBody(POLICY_BODIES.createPolicy)
  @ApiResponse(CREATE_POLICY_RESPONSES[201])
  @ApiResponse(CREATE_POLICY_RESPONSES[400])
  @ApiResponse(CREATE_POLICY_RESPONSES[401])
  async createPolicy(
    @Body() createData: CreatePolicyDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const policy = await this.policiesService.create(organizationId, createData);

    return {
      ...policy,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Patch(':id')
  @ApiOperation(POLICY_OPERATIONS.updatePolicy)
  @ApiParam(POLICY_PARAMS.policyId)
  @ApiBody(POLICY_BODIES.updatePolicy)
  @ApiResponse(UPDATE_POLICY_RESPONSES[200])
  @ApiResponse(UPDATE_POLICY_RESPONSES[400])
  @ApiResponse(UPDATE_POLICY_RESPONSES[401])
  @ApiResponse(UPDATE_POLICY_RESPONSES[404])
  async updatePolicy(
    @Param('id') id: string,
    @Body() updateData: UpdatePolicyDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const updatedPolicy = await this.policiesService.updateById(
      id,
      organizationId,
      updateData,
    );

    return {
      ...updatedPolicy,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Delete(':id')
  @ApiOperation(POLICY_OPERATIONS.deletePolicy)
  @ApiParam(POLICY_PARAMS.policyId)
  @ApiResponse(DELETE_POLICY_RESPONSES[200])
  @ApiResponse(DELETE_POLICY_RESPONSES[401])
  @ApiResponse(DELETE_POLICY_RESPONSES[404])
  async deletePolicy(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result = await this.policiesService.deleteById(id, organizationId);

    return {
      ...result,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }
}
