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
import { GET_ORGANIZATION_RESPONSES } from './schemas/get-organization.responses';
import { UPDATE_ORGANIZATION_RESPONSES } from './schemas/update-organization.responses';
import { DELETE_ORGANIZATION_RESPONSES } from './schemas/delete-organization.responses';
import { UPDATE_ORGANIZATION_BODY } from './schemas/organization-api-bodies';
import { ORGANIZATION_OPERATIONS } from './schemas/organization-operations';

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
  @ApiOperation(ORGANIZATION_OPERATIONS.getOrganization)
  @ApiResponse(GET_ORGANIZATION_RESPONSES[200])
  @ApiResponse(GET_ORGANIZATION_RESPONSES[401])
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
  @ApiOperation(ORGANIZATION_OPERATIONS.updateOrganization)
  @ApiBody(UPDATE_ORGANIZATION_BODY)
  @ApiResponse(UPDATE_ORGANIZATION_RESPONSES[200])
  @ApiResponse(UPDATE_ORGANIZATION_RESPONSES[400])
  @ApiResponse(UPDATE_ORGANIZATION_RESPONSES[401])
  @ApiResponse(UPDATE_ORGANIZATION_RESPONSES[404])
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
  @ApiOperation(ORGANIZATION_OPERATIONS.deleteOrganization)
  @ApiResponse(DELETE_ORGANIZATION_RESPONSES[200])
  @ApiResponse(DELETE_ORGANIZATION_RESPONSES[401])
  @ApiResponse(DELETE_ORGANIZATION_RESPONSES[404])
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
