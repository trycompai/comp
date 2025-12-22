import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiQuery,
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
import type { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { OrganizationService } from './organization.service';
import { GET_ORGANIZATION_RESPONSES } from './schemas/get-organization.responses';
import { UPDATE_ORGANIZATION_RESPONSES } from './schemas/update-organization.responses';
import { DELETE_ORGANIZATION_RESPONSES } from './schemas/delete-organization.responses';
import { TRANSFER_OWNERSHIP_RESPONSES } from './schemas/transfer-ownership.responses';
import { GET_ORGANIZATION_PRIMARY_COLOR_RESPONSES } from './schemas/get-organization-primary-color';
import {
  UPDATE_ORGANIZATION_BODY,
  TRANSFER_OWNERSHIP_BODY,
} from './schemas/organization-api-bodies';
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

  @Post('transfer-ownership')
  @ApiOperation(ORGANIZATION_OPERATIONS.transferOwnership)
  @ApiBody(TRANSFER_OWNERSHIP_BODY)
  @ApiResponse(TRANSFER_OWNERSHIP_RESPONSES[200])
  @ApiResponse(TRANSFER_OWNERSHIP_RESPONSES[400])
  @ApiResponse(TRANSFER_OWNERSHIP_RESPONSES[401])
  @ApiResponse(TRANSFER_OWNERSHIP_RESPONSES[403])
  @ApiResponse(TRANSFER_OWNERSHIP_RESPONSES[404])
  async transferOwnership(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() transferData: TransferOwnershipDto,
  ) {
    // For API key auth, userId must be provided in the request body
    // For JWT auth, userId comes from the authenticated session
    let userId: string;
    if (authContext.isApiKey) {
      // For API key auth, userId must be provided in the DTO
      if (!transferData.userId) {
        throw new BadRequestException(
          'User ID is required when using API key authentication. Provide userId in the request body.',
        );
      }
      userId = transferData.userId;
    } else {
      // For JWT auth, use the authenticated user's ID
      if (!authContext.userId) {
        throw new BadRequestException(
          'User ID is required for this operation. This endpoint requires session authentication.',
        );
      }
      userId = authContext.userId;
    }

    const result = await this.organizationService.transferOwnership(
      organizationId,
      userId,
      transferData.newOwnerId,
    );

    return {
      ...result,
      authType: authContext.authType,
      // Include user context (helpful for debugging)
      authenticatedUser: {
        id: userId,
        ...(authContext.userEmail && { email: authContext.userEmail }),
      },
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

  @Get('primary-color')
  @ApiOperation(ORGANIZATION_OPERATIONS.getPrimaryColor)
  @ApiQuery({
    name: 'token',
    required: false,
    description:
      'Access token for public access (alternative to authentication). When provided, authentication is not required.',
    example: 'tok_abc123def456',
  })
  @ApiResponse(GET_ORGANIZATION_PRIMARY_COLOR_RESPONSES[200])
  @ApiResponse(GET_ORGANIZATION_PRIMARY_COLOR_RESPONSES[401])
  @ApiResponse(GET_ORGANIZATION_PRIMARY_COLOR_RESPONSES[404])
  async getPrimaryColor(
    @Query('token') token: string | undefined,
    @OrganizationId() organizationId?: string,
    @AuthContext() authContext?: AuthContextType,
  ) {
    // If token is provided, use it to resolve organization
    // Otherwise, require organizationId from auth
    if (!token && !organizationId) {
      throw new BadRequestException(
        'Either authentication or access token is required',
      );
    }

    const primaryColor = await this.organizationService.getPrimaryColor(
      organizationId || '',
      token,
    );

    return {
      ...primaryColor,
      authType: token ? 'access-token' : authContext?.authType,
      // Include user context for session auth (helpful for debugging)
      ...(authContext?.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }
}
