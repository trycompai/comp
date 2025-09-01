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
import { PolicyResponseDto } from './dto/policy-responses.dto';
import { PoliciesService } from './policies.service';

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
  @ApiOperation({
    summary: 'Get all policies',
    description:
      'Returns all policies for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  })
  @ApiResponse({
    status: 200,
    description: 'Policies retrieved successfully',
    type: [PolicyResponseDto],
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid authentication or insufficient permissions',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Invalid or expired API key',
            'Invalid or expired session',
            'User does not have access to organization',
            'Organization context required',
          ],
        },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Get policy by ID',
    description:
      'Returns a specific policy by ID for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  })
  @ApiParam({
    name: 'id',
    description: 'Policy ID',
    example: 'pol_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Policy retrieved successfully',
    type: PolicyResponseDto,
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid authentication or insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Policy not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Policy with ID pol_abc123def456 not found',
        },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Create a new policy',
    description:
      'Creates a new policy for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  })
  @ApiBody({
    description: 'Policy creation data',
    type: CreatePolicyDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Policy created successfully',
    type: PolicyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid policy data',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Validation failed',
            'Invalid policy content format',
            'Policy name already exists',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid authentication or insufficient permissions',
  })
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
  @ApiOperation({
    summary: 'Update policy',
    description:
      'Partially updates a policy. Only provided fields will be updated. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  })
  @ApiParam({
    name: 'id',
    description: 'Policy ID',
    example: 'pol_abc123def456',
  })
  @ApiBody({
    description: 'Policy update data',
    type: UpdatePolicyDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Policy updated successfully',
    type: PolicyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid update data',
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid authentication or insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Policy not found',
  })
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
  @ApiOperation({
    summary: 'Delete policy',
    description:
      'Permanently deletes a policy. This action cannot be undone. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  })
  @ApiParam({
    name: 'id',
    description: 'Policy ID',
    example: 'pol_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Policy deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Indicates successful deletion',
          example: true,
        },
        deletedPolicy: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The deleted policy ID',
              example: 'pol_abc123def456',
            },
            name: {
              type: 'string',
              description: 'The deleted policy name',
              example: 'Data Privacy Policy',
            },
          },
        },
        authType: {
          type: 'string',
          enum: ['api-key', 'session'],
          description: 'How the request was authenticated',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid authentication or insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Policy not found',
  })
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
