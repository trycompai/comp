import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@Controller({ path: 'roles', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermission('ac', 'create')
  @ApiOperation({
    summary: 'Create a custom role',
    description: 'Create a new custom role with specified permissions. Only admins and owners can create roles.',
  })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({
    status: 201,
    description: 'Role created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'rol_abc123' },
        name: { type: 'string', example: 'compliance-lead' },
        permissions: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        isBuiltIn: { type: 'boolean', example: false },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid role data or role already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - cannot grant permissions you do not have' })
  async createRole(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() dto: CreateRoleDto,
  ) {
    return this.rolesService.createRole(
      organizationId,
      dto,
      authContext.userRoles || ['employee'],
    );
  }

  @Get()
  @RequirePermission('ac', 'read')
  @ApiOperation({
    summary: 'List all roles',
    description: 'List all roles for the organization, including built-in and custom roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of roles',
    schema: {
      type: 'object',
      properties: {
        builtInRoles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              isBuiltIn: { type: 'boolean' },
              description: { type: 'string' },
            },
          },
        },
        customRoles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              permissions: { type: 'object' },
              isBuiltIn: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listRoles(@OrganizationId() organizationId: string) {
    return this.rolesService.listRoles(organizationId);
  }

  @Get(':roleId')
  @RequirePermission('ac', 'read')
  @ApiOperation({
    summary: 'Get a role by ID',
    description: 'Get details of a specific custom role.',
  })
  @ApiParam({ name: 'roleId', description: 'Role ID', example: 'rol_abc123' })
  @ApiResponse({
    status: 200,
    description: 'Role details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        permissions: { type: 'object' },
        isBuiltIn: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async getRole(
    @OrganizationId() organizationId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.rolesService.getRole(organizationId, roleId);
  }

  @Patch(':roleId')
  @RequirePermission('ac', 'update')
  @ApiOperation({
    summary: 'Update a custom role',
    description: 'Update the name or permissions of a custom role. Cannot modify built-in roles.',
  })
  @ApiParam({ name: 'roleId', description: 'Role ID', example: 'rol_abc123' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        permissions: { type: 'object' },
        isBuiltIn: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid role data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - cannot grant permissions you do not have' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async updateRole(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.updateRole(
      organizationId,
      roleId,
      dto,
      authContext.userRoles || ['employee'],
    );
  }

  @Delete(':roleId')
  @RequirePermission('ac', 'delete')
  @ApiOperation({
    summary: 'Delete a custom role',
    description: 'Delete a custom role. Cannot delete if members are still assigned to it.',
  })
  @ApiParam({ name: 'roleId', description: 'Role ID', example: 'rol_abc123' })
  @ApiResponse({
    status: 200,
    description: 'Role deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Cannot delete - members assigned to role' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async deleteRole(
    @OrganizationId() organizationId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.rolesService.deleteRole(organizationId, roleId);
  }
}
