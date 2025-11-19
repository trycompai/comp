import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
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
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import type { AuthContext as AuthContextType } from '../auth/types';
import { CreateContextDto } from './dto/create-context.dto';
import { UpdateContextDto } from './dto/update-context.dto';
import { ContextService } from './context.service';
import { CONTEXT_OPERATIONS } from './schemas/context-operations';
import { CONTEXT_PARAMS } from './schemas/context-params';
import { CONTEXT_BODIES } from './schemas/context-bodies';
import { GET_ALL_CONTEXT_RESPONSES } from './schemas/get-all-context.responses';
import { GET_CONTEXT_BY_ID_RESPONSES } from './schemas/get-context-by-id.responses';
import { CREATE_CONTEXT_RESPONSES } from './schemas/create-context.responses';
import { UPDATE_CONTEXT_RESPONSES } from './schemas/update-context.responses';
import { DELETE_CONTEXT_RESPONSES } from './schemas/delete-context.responses';

@ApiTags('Context')
@Controller({ path: 'context', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  @Get()
  @ApiOperation(CONTEXT_OPERATIONS.getAllContext)
  @ApiResponse(GET_ALL_CONTEXT_RESPONSES[200])
  @ApiResponse(GET_ALL_CONTEXT_RESPONSES[401])
  @ApiResponse(GET_ALL_CONTEXT_RESPONSES[404])
  @ApiResponse(GET_ALL_CONTEXT_RESPONSES[500])
  async getAllContext(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const contextEntries =
      await this.contextService.findAllByOrganization(organizationId);

    return {
      data: contextEntries,
      count: contextEntries.length,
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
  @ApiOperation(CONTEXT_OPERATIONS.getContextById)
  @ApiParam(CONTEXT_PARAMS.contextId)
  @ApiResponse(GET_CONTEXT_BY_ID_RESPONSES[200])
  @ApiResponse(GET_CONTEXT_BY_ID_RESPONSES[401])
  @ApiResponse(GET_CONTEXT_BY_ID_RESPONSES[404])
  @ApiResponse(GET_CONTEXT_BY_ID_RESPONSES[500])
  async getContextById(
    @Param('id') contextId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const contextEntry = await this.contextService.findById(
      contextId,
      organizationId,
    );

    return {
      ...contextEntry,
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
  @ApiOperation(CONTEXT_OPERATIONS.createContext)
  @ApiBody(CONTEXT_BODIES.createContext)
  @ApiResponse(CREATE_CONTEXT_RESPONSES[201])
  @ApiResponse(CREATE_CONTEXT_RESPONSES[400])
  @ApiResponse(CREATE_CONTEXT_RESPONSES[401])
  @ApiResponse(CREATE_CONTEXT_RESPONSES[404])
  @ApiResponse(CREATE_CONTEXT_RESPONSES[500])
  async createContext(
    @Body() createContextDto: CreateContextDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const contextEntry = await this.contextService.create(
      organizationId,
      createContextDto,
    );

    return {
      ...contextEntry,
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
  @ApiOperation(CONTEXT_OPERATIONS.updateContext)
  @ApiParam(CONTEXT_PARAMS.contextId)
  @ApiBody(CONTEXT_BODIES.updateContext)
  @ApiResponse(UPDATE_CONTEXT_RESPONSES[200])
  @ApiResponse(UPDATE_CONTEXT_RESPONSES[400])
  @ApiResponse(UPDATE_CONTEXT_RESPONSES[401])
  @ApiResponse(UPDATE_CONTEXT_RESPONSES[404])
  @ApiResponse(UPDATE_CONTEXT_RESPONSES[500])
  async updateContext(
    @Param('id') contextId: string,
    @Body() updateContextDto: UpdateContextDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const updatedContextEntry = await this.contextService.updateById(
      contextId,
      organizationId,
      updateContextDto,
    );

    return {
      ...updatedContextEntry,
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
  @ApiOperation(CONTEXT_OPERATIONS.deleteContext)
  @ApiParam(CONTEXT_PARAMS.contextId)
  @ApiResponse(DELETE_CONTEXT_RESPONSES[200])
  @ApiResponse(DELETE_CONTEXT_RESPONSES[401])
  @ApiResponse(DELETE_CONTEXT_RESPONSES[404])
  @ApiResponse(DELETE_CONTEXT_RESPONSES[500])
  async deleteContext(
    @Param('id') contextId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result = await this.contextService.deleteById(
      contextId,
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
}
