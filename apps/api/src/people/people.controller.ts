import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBody,
  ApiExtraModels,
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
import { CreatePeopleDto } from './dto/create-people.dto';
import { UpdatePeopleDto } from './dto/update-people.dto';
import { BulkCreatePeopleDto } from './dto/bulk-create-people.dto';
import { PeopleResponseDto, UserResponseDto } from './dto/people-responses.dto';
import { PeopleService } from './people.service';
import { GET_ALL_PEOPLE_RESPONSES } from './schemas/get-all-people.responses';
import { CREATE_MEMBER_RESPONSES } from './schemas/create-member.responses';
import { BULK_CREATE_MEMBERS_RESPONSES } from './schemas/bulk-create-members.responses';
import { GET_PERSON_BY_ID_RESPONSES } from './schemas/get-person-by-id.responses';
import { UPDATE_MEMBER_RESPONSES } from './schemas/update-member.responses';
import { DELETE_MEMBER_RESPONSES } from './schemas/delete-member.responses';
import { PEOPLE_OPERATIONS } from './schemas/people-operations';
import { PEOPLE_PARAMS } from './schemas/people-params';
import { PEOPLE_BODIES } from './schemas/people-bodies';

@ApiTags('People')
@ApiExtraModels(PeopleResponseDto, UserResponseDto)
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
  @ApiOperation(PEOPLE_OPERATIONS.getAllPeople)
  @ApiResponse(GET_ALL_PEOPLE_RESPONSES[200])
  @ApiResponse(GET_ALL_PEOPLE_RESPONSES[401])
  @ApiResponse(GET_ALL_PEOPLE_RESPONSES[404])
  @ApiResponse(GET_ALL_PEOPLE_RESPONSES[500])
  async getAllPeople(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const people =
      await this.peopleService.findAllByOrganization(organizationId);

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

  @Post()
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

  @Patch(':id')
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

  @Delete(':id')
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
}
