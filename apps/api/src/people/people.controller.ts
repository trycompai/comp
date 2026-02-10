import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { AuditRead } from '../audit/skip-audit-log.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { CreatePeopleDto } from './dto/create-people.dto';
import { UpdatePeopleDto } from './dto/update-people.dto';
import { BulkCreatePeopleDto } from './dto/bulk-create-people.dto';
import { PeopleResponseDto, UserResponseDto } from './dto/people-responses.dto';
import { UpdateEmailPreferencesDto } from './dto/update-email-preferences.dto';
import { PeopleService } from './people.service';
import { GET_ALL_PEOPLE_RESPONSES } from './schemas/get-all-people.responses';
import { CREATE_MEMBER_RESPONSES } from './schemas/create-member.responses';
import { BULK_CREATE_MEMBERS_RESPONSES } from './schemas/bulk-create-members.responses';
import { GET_PERSON_BY_ID_RESPONSES } from './schemas/get-person-by-id.responses';
import { UPDATE_MEMBER_RESPONSES } from './schemas/update-member.responses';
import { DELETE_MEMBER_RESPONSES } from './schemas/delete-member.responses';
import { REMOVE_HOST_RESPONSES } from './schemas/remove-host.responses';
import { PEOPLE_OPERATIONS } from './schemas/people-operations';
import { PEOPLE_PARAMS } from './schemas/people-params';
import { PEOPLE_BODIES } from './schemas/people-bodies';

@ApiTags('People')
@ApiExtraModels(PeopleResponseDto, UserResponseDto)
@Controller({ path: 'people', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Get()
  @AuditRead()
  @RequirePermission('member', 'read')
  @ApiOperation(PEOPLE_OPERATIONS.getAllPeople)
  @ApiResponse(GET_ALL_PEOPLE_RESPONSES[200])
  @ApiResponse(GET_ALL_PEOPLE_RESPONSES[401])
  @ApiResponse(GET_ALL_PEOPLE_RESPONSES[404])
  @ApiResponse(GET_ALL_PEOPLE_RESPONSES[500])
  async getAllPeople(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Query('includeDeactivated') includeDeactivated?: string,
  ) {
    const people = await this.peopleService.findAllByOrganization(
      organizationId,
      includeDeactivated === 'true',
    );

    return {
      data: people,
      count: people.length,
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

  @Get('devices')
  @RequirePermission('member', 'read')
  @ApiOperation({ summary: 'Get all employee devices with fleet compliance data' })
  async getDevices(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const devices = await this.peopleService.getDevices(organizationId);

    return {
      data: devices,
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

  @Get('test-stats/by-assignee')
  @RequirePermission('member', 'read')
  @ApiOperation({ summary: 'Get integration test statistics grouped by assignee' })
  async getTestStatsByAssignee(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.peopleService.getTestStatsByAssignee(organizationId);

    return {
      data,
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

  @Post()
  @RequirePermission('member', 'create')
  @ApiOperation(PEOPLE_OPERATIONS.createMember)
  @ApiBody(PEOPLE_BODIES.createMember)
  @ApiResponse(CREATE_MEMBER_RESPONSES[201])
  @ApiResponse(CREATE_MEMBER_RESPONSES[400])
  @ApiResponse(CREATE_MEMBER_RESPONSES[401])
  @ApiResponse(CREATE_MEMBER_RESPONSES[404])
  @ApiResponse(CREATE_MEMBER_RESPONSES[500])
  async createMember(
    @Body() createData: CreatePeopleDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const member = await this.peopleService.create(organizationId, createData);

    return {
      ...member,
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

  @Post('bulk')
  @RequirePermission('member', 'create')
  @ApiOperation(PEOPLE_OPERATIONS.bulkCreateMembers)
  @ApiBody(PEOPLE_BODIES.bulkCreateMembers)
  @ApiResponse(BULK_CREATE_MEMBERS_RESPONSES[201])
  @ApiResponse(BULK_CREATE_MEMBERS_RESPONSES[400])
  @ApiResponse(BULK_CREATE_MEMBERS_RESPONSES[401])
  @ApiResponse(BULK_CREATE_MEMBERS_RESPONSES[404])
  @ApiResponse(BULK_CREATE_MEMBERS_RESPONSES[500])
  async bulkCreateMembers(
    @Body() bulkCreateData: BulkCreatePeopleDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result = await this.peopleService.bulkCreate(
      organizationId,
      bulkCreateData,
    );

    return {
      ...result,
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

  @Get(':id')
  @AuditRead()
  @RequirePermission('member', 'read')
  @ApiOperation(PEOPLE_OPERATIONS.getPersonById)
  @ApiParam(PEOPLE_PARAMS.memberId)
  @ApiResponse(GET_PERSON_BY_ID_RESPONSES[200])
  @ApiResponse(GET_PERSON_BY_ID_RESPONSES[401])
  @ApiResponse(GET_PERSON_BY_ID_RESPONSES[404])
  @ApiResponse(GET_PERSON_BY_ID_RESPONSES[500])
  async getPersonById(
    @Param('id') memberId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const person = await this.peopleService.findById(memberId, organizationId);

    return {
      ...person,
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

  @Get(':id/training-videos')
  @RequirePermission('member', 'read')
  @ApiOperation({ summary: 'Get training video completions for a member' })
  @ApiParam(PEOPLE_PARAMS.memberId)
  async getTrainingVideos(
    @Param('id') memberId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.peopleService.getTrainingVideos(
      memberId,
      organizationId,
    );

    return {
      data,
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

  @Get(':id/fleet-compliance')
  @RequirePermission('member', 'read')
  @ApiOperation({ summary: 'Get fleet/device compliance for a member' })
  @ApiParam(PEOPLE_PARAMS.memberId)
  async getFleetCompliance(
    @Param('id') memberId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.peopleService.getFleetCompliance(
      memberId,
      organizationId,
    );

    return {
      ...data,
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

  @Patch(':id')
  @RequirePermission('member', 'update')
  @ApiOperation(PEOPLE_OPERATIONS.updateMember)
  @ApiParam(PEOPLE_PARAMS.memberId)
  @ApiBody(PEOPLE_BODIES.updateMember)
  @ApiResponse(UPDATE_MEMBER_RESPONSES[200])
  @ApiResponse(UPDATE_MEMBER_RESPONSES[400])
  @ApiResponse(UPDATE_MEMBER_RESPONSES[401])
  @ApiResponse(UPDATE_MEMBER_RESPONSES[404])
  @ApiResponse(UPDATE_MEMBER_RESPONSES[500])
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
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Delete(':id/host/:hostId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('member', 'delete')
  @ApiOperation(PEOPLE_OPERATIONS.removeHost)
  @ApiParam(PEOPLE_PARAMS.memberId)
  @ApiParam(PEOPLE_PARAMS.hostId)
  @ApiResponse(REMOVE_HOST_RESPONSES[200])
  @ApiResponse(REMOVE_HOST_RESPONSES[401])
  @ApiResponse(REMOVE_HOST_RESPONSES[404])
  @ApiResponse(REMOVE_HOST_RESPONSES[500])
  async removeHost(
    @Param('id') memberId: string,
    @Param('hostId', ParseIntPipe) hostId: number,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result = await this.peopleService.removeHostById(
      memberId,
      organizationId,
      hostId,
    );

    return {
      ...result,
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

  @Delete(':id')
  @RequirePermission('member', 'delete')
  @ApiOperation(PEOPLE_OPERATIONS.deleteMember)
  @ApiParam(PEOPLE_PARAMS.memberId)
  @ApiResponse(DELETE_MEMBER_RESPONSES[200])
  @ApiResponse(DELETE_MEMBER_RESPONSES[401])
  @ApiResponse(DELETE_MEMBER_RESPONSES[404])
  @ApiResponse(DELETE_MEMBER_RESPONSES[500])
  async deleteMember(
    @Param('id') memberId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result = await this.peopleService.deleteById(
      memberId,
      organizationId,
      authContext.userId,
    );

    return {
      ...result,
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

  @Patch(':id/unlink-device')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('member', 'update')
  @ApiOperation(PEOPLE_OPERATIONS.unlinkDevice)
  @ApiParam(PEOPLE_PARAMS.memberId)
  @ApiResponse(UPDATE_MEMBER_RESPONSES[200])
  @ApiResponse(UPDATE_MEMBER_RESPONSES[400])
  @ApiResponse(UPDATE_MEMBER_RESPONSES[401])
  @ApiResponse(UPDATE_MEMBER_RESPONSES[404])
  @ApiResponse(UPDATE_MEMBER_RESPONSES[500])
  async unlinkDevice(
    @Param('id') memberId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const updatedMember = await this.peopleService.unlinkDevice(
      memberId,
      organizationId,
    );

    return {
      ...updatedMember,
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

  @Get('me/email-preferences')
  @RequirePermission('member', 'read')
  @ApiOperation({ summary: 'Get current user email notification preferences' })
  async getEmailPreferences(
    @AuthContext() authContext: AuthContextType,
    @OrganizationId() organizationId: string,
  ) {
    if (!authContext.userId) {
      throw new BadRequestException(
        'User ID is required. This endpoint requires session authentication.',
      );
    }

    return this.peopleService.getEmailPreferences(
      authContext.userId,
      authContext.userEmail!,
      organizationId,
    );
  }

  @Put('me/email-preferences')
  @RequirePermission('member', 'read')
  @ApiOperation({ summary: 'Update current user email notification preferences' })
  async updateEmailPreferences(
    @AuthContext() authContext: AuthContextType,
    @Body() body: UpdateEmailPreferencesDto,
  ) {
    if (!authContext.userId) {
      throw new BadRequestException(
        'User ID is required. This endpoint requires session authentication.',
      );
    }

    return this.peopleService.updateEmailPreferences(
      authContext.userId,
      body.preferences,
    );
  }
}
