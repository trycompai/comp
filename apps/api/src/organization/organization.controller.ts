import { Body, Controller, Delete, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthContext,
  IsApiKeyAuth,
  OrganizationId,
} from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import type { AuthContext as AuthContextType } from '../auth/types';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationService } from './organization.service';

@ApiTags('Organization')
@Controller({ path: 'organization', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey') // Still document API key for external customers
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  @ApiOperation({
    summary: 'Get organization information',
    description:
      'Returns detailed information about the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The organization ID',
          example: 'org_abc123def456',
        },
        name: {
          type: 'string',
          description: 'Organization name',
          example: 'Acme Corporation',
        },
        slug: {
          type: 'string',
          description: 'Organization slug',
          example: 'acme-corp',
        },
        logo: {
          type: 'string',
          nullable: true,
          description: 'Organization logo URL',
          example: 'https://example.com/logo.png',
        },
        metadata: {
          type: 'string',
          nullable: true,
          description: 'Additional metadata in JSON format',
          example: '{"theme": "dark", "preferences": {}}',
        },
        website: {
          type: 'string',
          nullable: true,
          description: 'Organization website URL',
          example: 'https://acme-corp.com',
        },
        onboardingCompleted: {
          type: 'boolean',
          description: 'Whether onboarding is completed',
          example: true,
        },
        hasAccess: {
          type: 'boolean',
          description: 'Whether organization has access to the platform',
          example: true,
        },
        fleetDmLabelId: {
          type: 'integer',
          nullable: true,
          description: 'FleetDM label ID for device management',
          example: 123,
        },
        isFleetSetupCompleted: {
          type: 'boolean',
          description: 'Whether FleetDM setup is completed',
          example: false,
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'When the organization was created',
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
  async getOrganization(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @IsApiKeyAuth() isApiKey: boolean,
  ) {
    const org = await this.organizationService.findById(organizationId);

    return {
      ...org,
      authType: authContext.authType,
      // Include user context for session auth (helpful for debugging)
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Patch()
  @ApiOperation({
    summary: 'Update organization',
    description:
      'Partially updates the authenticated organization. Only provided fields will be updated. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  })
  @ApiBody({
    description: 'Organization update data',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Organization name',
          example: 'New Acme Corporation',
        },
        slug: {
          type: 'string',
          description: 'Organization slug',
          example: 'new-acme-corp',
        },
        logo: {
          type: 'string',
          description: 'Organization logo URL',
          example: 'https://example.com/logo.png',
        },
        metadata: {
          type: 'string',
          description: 'Additional metadata in JSON format',
          example: '{"theme": "dark", "preferences": {}}',
        },
        website: {
          type: 'string',
          description: 'Organization website URL',
          example: 'https://acme-corp.com',
        },
        onboardingCompleted: {
          type: 'boolean',
          description: 'Whether onboarding is completed',
          example: true,
        },
        hasAccess: {
          type: 'boolean',
          description: 'Whether organization has access to the platform',
          example: true,
        },
        fleetDmLabelId: {
          type: 'integer',
          description: 'FleetDM label ID for device management',
          example: 123,
        },
        isFleetSetupCompleted: {
          type: 'boolean',
          description: 'Whether FleetDM setup is completed',
          example: false,
        },
      },
      additionalProperties: false,
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The organization ID',
          example: 'org_abc123def456',
        },
        name: {
          type: 'string',
          description: 'Organization name',
          example: 'New Acme Corporation',
        },
        slug: {
          type: 'string',
          description: 'Organization slug',
          example: 'new-acme-corp',
        },
        logo: {
          type: 'string',
          nullable: true,
          description: 'Organization logo URL',
          example: 'https://example.com/logo.png',
        },
        metadata: {
          type: 'string',
          nullable: true,
          description: 'Additional metadata in JSON format',
          example: '{"theme": "dark", "preferences": {}}',
        },
        website: {
          type: 'string',
          nullable: true,
          description: 'Organization website URL',
          example: 'https://acme-corp.com',
        },
        onboardingCompleted: {
          type: 'boolean',
          description: 'Whether onboarding is completed',
          example: true,
        },
        hasAccess: {
          type: 'boolean',
          description: 'Whether organization has access to the platform',
          example: true,
        },
        fleetDmLabelId: {
          type: 'integer',
          nullable: true,
          description: 'FleetDM label ID for device management',
          example: 123,
        },
        isFleetSetupCompleted: {
          type: 'boolean',
          description: 'Whether FleetDM setup is completed',
          example: false,
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'When the organization was created',
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
    status: 400,
    description: 'Bad Request - Invalid update data',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Validation failed',
            'Invalid slug format',
            'Organization name already exists',
          ],
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
  async updateOrganization(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() updateData: UpdateOrganizationDto,
  ) {
    const updatedOrg = await this.organizationService.updateById(
      organizationId,
      updateData,
    );

    return {
      ...updatedOrg,
      authType: authContext.authType,
      // Include user context for session auth (helpful for debugging)
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Delete()
  @ApiOperation({
    summary: 'Delete organization',
    description:
      'Permanently deletes the authenticated organization. This action cannot be undone. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Indicates successful deletion',
          example: true,
        },
        deletedOrganization: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The deleted organization ID',
              example: 'org_abc123def456',
            },
            name: {
              type: 'string',
              description: 'The deleted organization name',
              example: 'Acme Corporation',
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
  async deleteOrganization(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result = await this.organizationService.deleteById(organizationId);

    return {
      ...result,
      authType: authContext.authType,
      // Include user context for session auth (helpful for debugging)
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }
}
