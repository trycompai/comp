import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db } from '@trycompai/db';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';

// Valid resources and their actions based on our permission system
const VALID_RESOURCES: Record<string, string[]> = {
  organization: ['read', 'update', 'delete'],
  member: ['create', 'read', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  control: ['create', 'read', 'update', 'delete', 'assign', 'export'],
  evidence: ['create', 'read', 'update', 'delete', 'upload', 'export'],
  policy: ['create', 'read', 'update', 'delete', 'publish', 'approve'],
  risk: ['create', 'read', 'update', 'delete', 'assess', 'export'],
  vendor: ['create', 'read', 'update', 'delete', 'assess'],
  task: ['create', 'read', 'update', 'delete', 'assign', 'complete'],
  framework: ['create', 'read', 'update', 'delete'],
  audit: ['create', 'read', 'update', 'export'],
  finding: ['create', 'read', 'update', 'delete'],
  questionnaire: ['create', 'read', 'update', 'delete', 'respond'],
  integration: ['create', 'read', 'update', 'delete'],
  apiKey: ['create', 'read', 'delete'],
  app: ['read'],
  trust: ['read', 'update'],
};

// Built-in roles that cannot be modified or deleted
const BUILT_IN_ROLES = ['owner', 'admin', 'auditor', 'employee', 'contractor'];

@Injectable()
export class RolesService {
  /**
   * Validate that permissions don't include invalid resources or actions
   */
  private validatePermissions(permissions: Record<string, string[]>): void {
    for (const [resource, actions] of Object.entries(permissions)) {
      if (!VALID_RESOURCES[resource]) {
        throw new BadRequestException(`Invalid resource: ${resource}`);
      }

      const validActions = VALID_RESOURCES[resource];
      for (const action of actions) {
        if (!validActions.includes(action)) {
          throw new BadRequestException(
            `Invalid action '${action}' for resource '${resource}'. Valid actions: ${validActions.join(', ')}`
          );
        }
      }
    }
  }

  /**
   * Check if caller has all the permissions they're trying to grant
   * Prevents privilege escalation
   * @param callerRoles Array of roles the caller has (supports multiple roles)
   */
  private async validateNoPrivilegeEscalation(
    callerRoles: string[],
    permissions: Record<string, string[]>,
    organizationId: string,
  ): Promise<void> {
    // Get the caller's combined effective permissions from all their roles
    const callerPermissions = await this.getCombinedPermissions(callerRoles, organizationId);

    for (const [resource, actions] of Object.entries(permissions)) {
      const callerActions = callerPermissions[resource] || [];

      for (const action of actions) {
        if (!callerActions.includes(action)) {
          throw new ForbiddenException(
            `Cannot grant '${resource}:${action}' permission - you don't have this permission`
          );
        }
      }
    }

    // Special check: only owners can grant organization:delete
    if (permissions.organization?.includes('delete') && !callerRoles.includes('owner')) {
      throw new ForbiddenException(
        'Only organization owners can grant organization:delete permission'
      );
    }
  }

  /**
   * Get combined permissions from multiple roles
   * Merges permissions from all roles (union of all permissions)
   */
  private async getCombinedPermissions(
    roleNames: string[],
    organizationId: string,
  ): Promise<Record<string, string[]>> {
    const combined: Record<string, string[]> = {};

    for (const roleName of roleNames) {
      const rolePermissions = await this.getEffectivePermissions(roleName, organizationId);

      for (const [resource, actions] of Object.entries(rolePermissions)) {
        if (!combined[resource]) {
          combined[resource] = [];
        }
        // Add unique actions
        for (const action of actions) {
          if (!combined[resource].includes(action)) {
            combined[resource].push(action);
          }
        }
      }
    }

    return combined;
  }

  /**
   * Get effective permissions for a role
   */
  private async getEffectivePermissions(
    roleName: string,
    organizationId: string,
  ): Promise<Record<string, string[]>> {
    // Check if it's a built-in role
    if (BUILT_IN_ROLES.includes(roleName)) {
      // Return the built-in role permissions (simplified - in reality would check the ac definitions)
      const builtInPermissions: Record<string, Record<string, string[]>> = {
        owner: { ...VALID_RESOURCES }, // Owner has all permissions
        admin: {
          ...VALID_RESOURCES,
          organization: ['read', 'update'], // Admin can't delete org
        },
        auditor: {
          organization: ['read'],
          member: ['create', 'read'],
          invitation: ['create'],
          control: ['read', 'export'],
          evidence: ['read', 'export'],
          policy: ['read'],
          risk: ['read', 'export'],
          vendor: ['read'],
          task: ['read'],
          framework: ['read'],
          audit: ['read', 'export'],
          finding: ['create', 'read', 'update'],
          questionnaire: ['read'],
          integration: ['read'],
          app: ['read'],
          trust: ['read'],
        },
        employee: {
          task: ['read', 'complete'],
          evidence: ['read', 'upload'],
          policy: ['read'],
          questionnaire: ['read', 'respond'],
          trust: ['read', 'update'],
        },
        contractor: {
          task: ['read', 'complete'],
          evidence: ['read', 'upload'],
          policy: ['read'],
          trust: ['read', 'update'],
        },
      };
      return builtInPermissions[roleName] || {};
    }

    // For custom roles, look up in database
    const customRole = await db.organizationRole.findFirst({
      where: {
        organizationId,
        name: roleName,
      },
    });

    if (customRole) {
      const perms = typeof customRole.permissions === 'string'
        ? JSON.parse(customRole.permissions)
        : customRole.permissions;
      return perms as Record<string, string[]>;
    }

    return {};
  }

  /**
   * Create a new custom role
   * @param callerRoles Array of roles the caller has (supports multiple roles)
   */
  async createRole(
    organizationId: string,
    dto: CreateRoleDto,
    callerRoles: string[],
  ) {
    // Validate role name isn't a built-in role
    if (BUILT_IN_ROLES.includes(dto.name)) {
      throw new BadRequestException(`Cannot create role with reserved name: ${dto.name}`);
    }

    // Validate permissions
    this.validatePermissions(dto.permissions);

    // Check for privilege escalation
    await this.validateNoPrivilegeEscalation(callerRoles, dto.permissions, organizationId);

    // Check if role already exists
    const existing = await db.organizationRole.findFirst({
      where: {
        organizationId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new BadRequestException(`Role '${dto.name}' already exists`);
    }

    // Check max roles limit
    const roleCount = await db.organizationRole.count({
      where: { organizationId },
    });

    if (roleCount >= 20) {
      throw new BadRequestException('Maximum of 20 custom roles per organization');
    }

    // Create the role
    const role = await db.organizationRole.create({
      data: {
        name: dto.name,
        permissions: JSON.stringify(dto.permissions),
        organizationId,
      },
    });

    return {
      ...role,
      permissions: JSON.parse(role.permissions),
    };
  }

  /**
   * List all roles for an organization (built-in + custom)
   */
  async listRoles(organizationId: string) {
    // Get custom roles
    const customRoles = await db.organizationRole.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    // Get member counts for custom roles
    const memberCounts = await Promise.all(
      customRoles.map(async (role) => {
        const count = await db.member.count({
          where: { organizationId, role: { contains: role.name } },
        });
        return { roleId: role.id, count };
      }),
    );
    const countMap = new Map(memberCounts.map((mc) => [mc.roleId, mc.count]));

    // Include built-in roles info
    const builtInRoles = BUILT_IN_ROLES.map(name => ({
      name,
      isBuiltIn: true,
      description: this.getBuiltInRoleDescription(name),
    }));

    return {
      builtInRoles,
      customRoles: customRoles.map(r => ({
        id: r.id,
        name: r.name,
        permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions,
        isBuiltIn: false,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        _count: { members: countMap.get(r.id) ?? 0 },
      })),
    };
  }

  /**
   * Get a single role by ID
   */
  async getRole(organizationId: string, roleId: string) {
    const role = await db.organizationRole.findFirst({
      where: {
        id: roleId,
        organizationId,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role not found: ${roleId}`);
    }

    const memberCount = await db.member.count({
      where: { organizationId, role: { contains: role.name } },
    });

    return {
      id: role.id,
      name: role.name,
      permissions: typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions,
      isBuiltIn: false,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
      _count: { members: memberCount },
    };
  }

  /**
   * Update a custom role
   * @param callerRoles Array of roles the caller has (supports multiple roles)
   */
  async updateRole(
    organizationId: string,
    roleId: string,
    dto: UpdateRoleDto,
    callerRoles: string[],
  ) {
    const role = await db.organizationRole.findFirst({
      where: {
        id: roleId,
        organizationId,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role not found: ${roleId}`);
    }

    // Validate new name if provided
    if (dto.name && BUILT_IN_ROLES.includes(dto.name)) {
      throw new BadRequestException(`Cannot use reserved name: ${dto.name}`);
    }

    // Check name uniqueness if changing name
    if (dto.name && dto.name !== role.name) {
      const existing = await db.organizationRole.findFirst({
        where: {
          organizationId,
          name: dto.name,
        },
      });

      if (existing) {
        throw new BadRequestException(`Role '${dto.name}' already exists`);
      }
    }

    // Validate and check permissions if provided
    if (dto.permissions) {
      this.validatePermissions(dto.permissions);
      await this.validateNoPrivilegeEscalation(callerRoles, dto.permissions, organizationId);
    }

    // Update the role
    const updated = await db.organizationRole.update({
      where: { id: roleId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.permissions && { permissions: JSON.stringify(dto.permissions) }),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      permissions: typeof updated.permissions === 'string' ? JSON.parse(updated.permissions) : updated.permissions,
      isBuiltIn: false,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete a custom role
   */
  async deleteRole(organizationId: string, roleId: string) {
    const role = await db.organizationRole.findFirst({
      where: {
        id: roleId,
        organizationId,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role not found: ${roleId}`);
    }

    // Check if any members are assigned to this role
    const membersWithRole = await db.member.count({
      where: {
        organizationId,
        role: role.name,
      },
    });

    if (membersWithRole > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' - ${membersWithRole} member(s) are assigned to it. ` +
        `Reassign them to a different role first.`
      );
    }

    // Delete the role
    await db.organizationRole.delete({
      where: { id: roleId },
    });

    return { success: true, message: `Role '${role.name}' deleted` };
  }

  /**
   * Get merged permissions for a list of custom role names.
   * Used by the frontend to resolve effective permissions for custom roles.
   */
  async getPermissionsForRoles(
    organizationId: string,
    roleNames: string[],
  ): Promise<Record<string, string[]>> {
    if (roleNames.length === 0) return {};

    const customRoles = await db.organizationRole.findMany({
      where: {
        organizationId,
        name: { in: roleNames },
      },
    });

    const combined: Record<string, string[]> = {};
    for (const role of customRoles) {
      const perms =
        typeof role.permissions === 'string'
          ? JSON.parse(role.permissions)
          : role.permissions;
      for (const [resource, actions] of Object.entries(
        perms as Record<string, string[]>,
      )) {
        if (!combined[resource]) {
          combined[resource] = [];
        }
        for (const action of actions) {
          if (!combined[resource].includes(action)) {
            combined[resource].push(action);
          }
        }
      }
    }

    return combined;
  }

  /**
   * Get description for built-in roles
   */
  private getBuiltInRoleDescription(name: string): string {
    const descriptions: Record<string, string> = {
      owner: 'Full access to everything including organization deletion',
      admin: 'Full access except organization deletion',
      auditor: 'Read-only access with export capabilities for compliance audits',
      employee: 'Limited access to assigned tasks and basic compliance activities',
      contractor: 'Limited access similar to employee for external contractors',
    };
    return descriptions[name] || '';
  }
}
