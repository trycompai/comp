import { 
  Controller, 
  Get, 
  UseGuards 
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
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
import { DeviceResponseDto } from './dto/device-responses.dto';
import { DevicesService } from './devices.service';

@ApiTags('Devices')
@Controller({ path: 'devices', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all devices',
    description:
      'Returns all devices for the authenticated organization from FleetDM. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  })
  @ApiResponse({
    status: 200,
    description: 'Devices retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/DeviceResponseDto' },
        },
        count: {
          type: 'number',
          description: 'Total number of devices',
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
    description: 'Internal server error - FleetDM integration issue',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Failed to retrieve devices: FleetDM connection failed',
            'Organization does not have FleetDM configured',
          ],
        },
      },
    },
  })
  async getAllDevices(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const devices = await this.devicesService.findAllByOrganization(organizationId);

    return {
      data: devices,
      count: devices.length,
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