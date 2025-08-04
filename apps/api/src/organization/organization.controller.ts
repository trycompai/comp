import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { Organization } from '../auth/organization.decorator';
import { OrganizationService } from './organization.service';

@ApiTags('Organization')
@Controller({ path: 'organization', version: '1' })
@UseGuards(ApiKeyGuard)
@ApiSecurity('apikey')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}
  @Get()
  @ApiOperation({
    summary: 'Get organization information',
    description:
      'Returns detailed information about the authenticated organization',
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
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'When the organization was created',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Invalid or expired API key',
        },
      },
    },
  })
  async getOrganization(@Organization() organizationId: string) {
    return this.organizationService.findById(organizationId);
  }
}
