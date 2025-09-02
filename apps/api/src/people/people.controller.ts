import { 
  Controller, 
  Get, 
  Param,
  UseGuards 
} from '@nestjs/common';
import {
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
}
