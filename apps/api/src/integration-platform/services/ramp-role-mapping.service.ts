import { Injectable, Logger } from '@nestjs/common';
import { db, type Prisma } from '@db';
import type { RoleMappingEntry } from '@trycompai/integration-platform';

const BUILT_IN_ROLES = ['owner', 'admin', 'auditor', 'employee', 'contractor'];

/** Ramp roles that map to portal-only (employee-like) access */
const EMPLOYEE_LIKE_ROLES = new Set(['BUSINESS_USER', 'GUEST_USER']);

/** Default Ramp → CompAI role mappings */
const DEFAULT_BUILT_IN_MAPPINGS: Record<string, string> = {
  BUSINESS_OWNER: 'admin',
  BUSINESS_ADMIN: 'admin',
  AUDITOR: 'auditor',
  BUSINESS_USER: 'employee',
};

/** Read-only permissions for custom roles with app access */
const APP_READ_ONLY_PERMISSIONS: Record<string, string[]> = {
  app: ['read'],
  organization: ['read'],
  member: ['read'],
  control: ['read'],
  evidence: ['read'],
  policy: ['read'],
  risk: ['read'],
  vendor: ['read'],
  task: ['read'],
  framework: ['read'],
  audit: ['read'],
  finding: ['read'],
  questionnaire: ['read'],
  integration: ['read'],
  trust: ['read'],
  portal: ['read', 'update'],
};

/** Portal-only permissions (employee-like) */
const PORTAL_ONLY_PERMISSIONS: Record<string, string[]> = {
  policy: ['read'],
  portal: ['read', 'update'],
};

@Injectable()
export class RampRoleMappingService {
  private readonly logger = new Logger(RampRoleMappingService.name);

  /**
   * Generate default mapping entries for discovered Ramp roles
   */
  getDefaultMapping(rampRoles: string[]): RoleMappingEntry[] {
    return rampRoles.map((rampRole) => {
      const builtInMatch = DEFAULT_BUILT_IN_MAPPINGS[rampRole];

      if (builtInMatch) {
        return {
          rampRole,
          compRole: builtInMatch,
          isBuiltIn: true,
        };
      }

      // Custom role — use raw Ramp role name, determine permissions based on whether it's employee-like
      const isEmployeeLike = EMPLOYEE_LIKE_ROLES.has(rampRole);

      return {
        rampRole,
        compRole: rampRole,
        isBuiltIn: false,
        permissions: isEmployeeLike
          ? PORTAL_ONLY_PERMISSIONS
          : APP_READ_ONLY_PERMISSIONS,
        obligations: isEmployeeLike
          ? { compliance: true }
          : ({} as Record<string, boolean>),
      };
    });
  }

  /**
   * Ensure all custom roles in the mapping exist in the database.
   * Creates missing ones.
   */
  async ensureCustomRolesExist(
    organizationId: string,
    mapping: RoleMappingEntry[],
  ): Promise<void> {
    const customEntries = mapping.filter((m) => !m.isBuiltIn);

    for (const entry of customEntries) {
      const existing = await db.organizationRole.findFirst({
        where: { organizationId, name: entry.compRole },
      });

      if (existing) {
        this.logger.log(
          `Custom role "${entry.compRole}" already exists for org ${organizationId}`,
        );
        continue;
      }

      await db.organizationRole.create({
        data: {
          name: entry.compRole,
          permissions: JSON.stringify(entry.permissions ?? APP_READ_ONLY_PERMISSIONS),
          obligations: JSON.stringify(entry.obligations ?? {}),
          organizationId,
        },
      });

      this.logger.log(
        `Created custom role "${entry.compRole}" for org ${organizationId}`,
      );
    }
  }

  /**
   * Resolve a Ramp user's role to the CompAI role name using the mapping
   */
  resolveRole(
    rampRole: string | undefined,
    mapping: RoleMappingEntry[],
  ): string {
    if (!rampRole) return 'employee';

    const entry = mapping.find((m) => m.rampRole === rampRole);
    if (!entry) return 'employee';

    return entry.compRole;
  }

  /**
   * Get the saved role mapping from connection variables
   */
  async getSavedMapping(
    connectionId: string,
  ): Promise<RoleMappingEntry[] | null> {
    const connection = await db.integrationConnection.findUnique({
      where: { id: connectionId },
      select: { variables: true },
    });

    const variables = (connection?.variables ?? {}) as Record<string, unknown>;
    const mapping = variables.role_mapping;

    if (!Array.isArray(mapping) || mapping.length === 0) return null;

    return mapping as RoleMappingEntry[];
  }

  /**
   * Save role mapping and discovered roles to connection variables
   */
  async saveMapping(
    connectionId: string,
    mapping: RoleMappingEntry[],
    discoveredRoles?: Array<{ role: string; userCount: number }>,
  ): Promise<void> {
    const connection = await db.integrationConnection.findUnique({
      where: { id: connectionId },
      select: { variables: true },
    });

    const existingVariables = (connection?.variables ?? {}) as Record<
      string,
      unknown
    >;

    const updatedVariables: Record<string, unknown> = {
      ...existingVariables,
      role_mapping: mapping,
    };

    if (discoveredRoles) {
      updatedVariables.discovered_roles = discoveredRoles;
    }

    await db.integrationConnection.update({
      where: { id: connectionId },
      data: {
        variables: updatedVariables as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Save only discovered roles without touching the role_mapping field
   */
  async saveDiscoveredRoles(
    connectionId: string,
    discoveredRoles: Array<{ role: string; userCount: number }>,
  ): Promise<void> {
    const connection = await db.integrationConnection.findUnique({
      where: { id: connectionId },
      select: { variables: true },
    });

    const existingVariables = (connection?.variables ?? {}) as Record<
      string,
      unknown
    >;

    const updatedVariables: Record<string, unknown> = {
      ...existingVariables,
      discovered_roles: discoveredRoles,
    };

    await db.integrationConnection.update({
      where: { id: connectionId },
      data: {
        variables: updatedVariables as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Get cached discovered roles from connection variables
   */
  async getCachedDiscoveredRoles(
    connectionId: string,
  ): Promise<Array<{ role: string; userCount: number }> | null> {
    const connection = await db.integrationConnection.findUnique({
      where: { id: connectionId },
      select: { variables: true },
    });

    const variables = (connection?.variables ?? {}) as Record<string, unknown>;
    const roles = variables.discovered_roles;

    if (!Array.isArray(roles) || roles.length === 0) return null;

    return roles as Array<{ role: string; userCount: number }>;
  }

}
