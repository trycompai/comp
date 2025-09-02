import { 
  Controller, 
  Get, 
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { CreatePeopleDto } from './dto/create-people.dto';
import { UpdatePeopleDto } from './dto/update-people.dto';
import { BulkCreatePeopleDto } from './dto/bulk-create-people.dto';
import { PeopleResponseDto } from './dto/people-responses.dto';
import { PeopleService } from './people.service';

@ApiTags('People')
@Controller({ path: 'people', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all people',
    description:
      'Returns all members for the authenticated organization with their user information. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  })
  @ApiResponse({
    status: 200,
    description: 'People retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/PeopleResponseDto' },
        },
        count: {
          type: 'number',
          description: 'Total number of people',
          example: 25,
        },
        authType: {
          type: 'string',
          enum: ['api-key', 'session'],
          description: 'How the request was authenticated',
        },
        authenticatedUser: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
              example: 'usr_abc123def456',
            },
            email: {
              type: 'string',
              description: 'User email',
              example: 'user@company.com',
            },
          },
        },
      },
    },
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
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Organization with ID org_abc123def456 not found',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Failed to retrieve members',
        },
      },
    },
  })
  async getAllPeople(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const people = await this.peopleService.findAllByOrganization(organizationId);

    return {
      data: people,
      count: people.length,
      authType: authContext.authType,
      ...(authContext.userId && authContext.userEmail && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new member',
    description:
      'Adds a new member to the authenticated organization. The user must already exist in the system. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  })
  @ApiBody({
    description: 'Member creation data',
    type: CreatePeopleDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Member created successfully',
    type: PeopleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid member data or user already exists',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Validation failed',
            'User user@example.com is already a member of this organization',
            'Invalid user ID or role',
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
  @ApiResponse({
    status: 404,
    description: 'Organization or user not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Organization with ID org_abc123def456 not found',
            'User with ID usr_abc123def456 not found',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async createMember(
    @Body() createData: CreatePeopleDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const member = await this.peopleService.create(organizationId, createData);

    return {
      ...member,
      authType: authContext.authType,
      ...(authContext.userId && authContext.userEmail && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Add multiple members to organization',
    description:
      'Bulk adds multiple members to the authenticated organization. Each member must have a valid user ID that exists in the system. Members who already exist in the organization or have invalid data will be skipped with error details returned. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  })
  @ApiBody({
    description: 'Bulk member creation data',
    type: BulkCreatePeopleDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk member creation completed',
    schema: {
      type: 'object',
      properties: {
        created: {
          type: 'array',
          items: { $ref: '#/components/schemas/PeopleResponseDto' },
          description: 'Successfully created members',
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              index: {
                type: 'number',
                description: 'Index in the original array where the error occurred',
                example: 2,
              },
              userId: {
                type: 'string',
                description: 'User ID that failed to be added',
                example: 'usr_abc123def456',
              },
              error: {
                type: 'string',
                description: 'Error message explaining why the member could not be created',
                example: 'User user@example.com is already a member of this organization',
              },
            },
          },
          description: 'Members that failed to be created with error details',
        },
        summary: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'Total number of members in the request',
              example: 5,
            },
            successful: {
              type: 'number',
              description: 'Number of members successfully created',
              example: 3,
            },
            failed: {
              type: 'number',
              description: 'Number of members that failed to be created',
              example: 2,
            },
          },
        },
        authType: {
          type: 'string',
          enum: ['api-key', 'session'],
          description: 'How the request was authenticated',
        },
        authenticatedUser: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
              example: 'usr_abc123def456',
            },
            email: {
              type: 'string',
              description: 'User email',
              example: 'user@company.com',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid bulk data or validation errors',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Validation failed',
            'Members array cannot be empty',
            'Maximum 100 members allowed per bulk request',
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
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Organization with ID org_abc123def456 not found',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async bulkCreateMembers(
    @Body() bulkCreateData: BulkCreatePeopleDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result = await this.peopleService.bulkCreate(organizationId, bulkCreateData);

    return {
      ...result,
      authType: authContext.authType,
      ...(authContext.userId && authContext.userEmail && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get person by ID',
    description:
      'Returns a specific member by ID for the authenticated organization with their user information. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  })
  @ApiParam({
    name: 'id',
    description: 'Member ID',
    example: 'mem_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Person retrieved successfully',
    type: PeopleResponseDto,
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid authentication or insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization or member not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Organization with ID org_abc123def456 not found',
            'Member with ID mem_abc123def456 not found in organization org_abc123def456',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getPersonById(
    @Param('id') memberId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const person = await this.peopleService.findById(memberId, organizationId);

    return {
      ...person,
      authType: authContext.authType,
      ...(authContext.userId && authContext.userEmail && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update member',
    description:
      'Partially updates a member. Only provided fields will be updated. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  })
  @ApiParam({
    name: 'id',
    description: 'Member ID',
    example: 'mem_abc123def456',
  })
  @ApiBody({
    description: 'Member update data',
    type: UpdatePeopleDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Member updated successfully',
    type: PeopleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid update data or user conflict',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Validation failed',
            'User user@example.com is already a member of this organization',
            'Invalid user ID or role',
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
  @ApiResponse({
    status: 404,
    description: 'Organization, member, or user not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Organization with ID org_abc123def456 not found',
            'Member with ID mem_abc123def456 not found in organization org_abc123def456',
            'User with ID usr_abc123def456 not found',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateMember(
    @Param('id') memberId: string,
    @Body() updateData: UpdatePeopleDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const updatedMember = await this.peopleService.updateById(
      memberId,
      organizationId,
      updateData,
    );

    return {
      ...updatedMember,
      authType: authContext.authType,
      ...(authContext.userId && authContext.userEmail && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete member',
    description:
      'Permanently removes a member from the organization. This action cannot be undone. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  })
  @ApiParam({
    name: 'id',
    description: 'Member ID',
    example: 'mem_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Member deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Indicates successful deletion',
          example: true,
        },
        deletedMember: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The deleted member ID',
              example: 'mem_abc123def456',
            },
            name: {
              type: 'string',
              description: 'The deleted member name',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              description: 'The deleted member email',
              example: 'john.doe@company.com',
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
    description: 'Organization or member not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Organization with ID org_abc123def456 not found',
            'Member with ID mem_abc123def456 not found in organization org_abc123def456',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async deleteMember(
    @Param('id') memberId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result = await this.peopleService.deleteById(memberId, organizationId);

    return {
      ...result,
      authType: authContext.authType,
      ...(authContext.userId && authContext.userEmail && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }
}
