import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
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
import { DevicesByMemberResponseDto } from './dto/devices-by-member-response.dto';
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
    content: {
      'application/json': {
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
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid authentication or insufficient permissions',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Invalid or expired API key',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Organization with ID org_abc123def456 not found',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - FleetDM integration issue',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Organization does not have FleetDM configured',
            },
          },
        },
      },
    },
  })
  async getAllDevices(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const devices =
      await this.devicesService.findAllByOrganization(organizationId);

    return {
      data: devices,
      count: devices.length,
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

  @Get('member/:memberId')
  @ApiOperation({
    summary: 'Get devices by member ID',
    description:
      "Returns all devices assigned to a specific member within the authenticated organization. Devices are fetched from FleetDM using the member's dedicated fleetDmLabelId. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).",
  })
  @ApiParam({
    name: 'memberId',
    description: 'Member ID to get devices for',
    example: 'mem_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Member devices retrieved successfully',
    type: DevicesByMemberResponseDto,
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid authentication or insufficient permissions',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Unauthorized' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organization or member not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example:
                'Member with ID mem_abc123def456 not found in organization org_abc123def456',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - FleetDM integration issue',
  })
  async getDevicesByMember(
    @Param('memberId') memberId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ): Promise<DevicesByMemberResponseDto> {
    const [devices, member] = await Promise.all([
      this.devicesService.findAllByMember(organizationId, memberId),
      this.devicesService.getMemberById(organizationId, memberId),
    ]);

    return {
      data: devices,
      count: devices.length,
      member,
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
