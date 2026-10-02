import { db } from '@db';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BUILT_IN_ROLE_PERMISSIONS, isRestrictedRole } from '@trycompai/auth';
import { z } from 'zod';
import { resolveRolePermissions } from '../../auth/app-access';
import { resolveServiceByName } from '../../auth/service-token.config';
import type { AuthContext } from '../../auth/types';
import { parseRoles } from './role-authorization';

const permissionSchema = z.record(z.string(), z.array(z.string()));
type Permissions = Record<string, string[]>;

function permissionsFromScopes(scopes: string[]): Permissions {
  const permissions: Permissions = {};
  for (const scope of scopes) {
    const [resource, action] = scope.split(':');
    if (!resource || !action) continue;
    (permissions[resource] ??= []).push(action);
  }
  return permissions;
}

async function resolveCallerPermissions({
  organizationId,
  authContext,
}: {
  organizationId: string;
  authContext: AuthContext;
}): Promise<Permissions> {
  if (!authContext || authContext.organizationId !== organizationId) {
    throw new ForbiddenException(
      'Authentication is required for this organization',
    );
  }
  if (authContext.authType === 'api-key' && authContext.isApiKey) {
    return permissionsFromScopes(authContext.apiKeyScopes ?? []);
  }
  if (authContext.authType === 'service' && authContext.isServiceToken) {
    const service = resolveServiceByName(authContext.serviceName);
    return permissionsFromScopes(service?.permissions ?? []);
  }
  if (
    authContext.authType !== 'session' ||
    !authContext.userId ||
    authContext.isApiKey ||
    authContext.isServiceToken
  ) {
    throw new ForbiddenException('An authenticated caller is required');
  }
  const member = await db.member.findFirst({
    where: {
      userId: authContext.userId,
      organizationId,
      isActive: true,
      deactivated: false,
    },
    select: { role: true },
  });
  if (!member)
    throw new ForbiddenException('Caller is not an active organization member');
  return resolveRolePermissions(organizationId, parseRoles(member.role));
}

function parseCustomPermissions(raw: unknown): Permissions {
  try {
    const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return permissionSchema.parse(value);
  } catch {
    throw new BadRequestException('Role permissions are invalid');
  }
}

/** Validate the whole batch before user validation or member writes. */
export async function authorizeMemberCreation({
  organizationId,
  roles,
  authContext,
}: {
  organizationId: string;
  roles: string[];
  authContext: AuthContext;
}): Promise<void> {
  const callerPermissions = await resolveCallerPermissions({
    organizationId,
    authContext,
  });
  if (!callerPermissions.member?.includes('create')) {
    throw new ForbiddenException('Caller lacks permission to create members');
  }
  const targetRoles = new Set<string>();
  for (const roleString of roles) {
    const parsed = parseRoles(roleString);
    if (!parsed.length || roleString.split(',').some((role) => !role.trim())) {
      throw new BadRequestException('At least one valid role is required');
    }
    for (const role of parsed) targetRoles.add(role);
  }
  if (targetRoles.has('owner')) {
    throw new ForbiddenException(
      'Owner role can only be assigned via /organization/transfer-ownership',
    );
  }
  const customNames = [...targetRoles].filter(
    (role) => !Object.hasOwn(BUILT_IN_ROLE_PERMISSIONS, role),
  );
  const customRoles = customNames.length
    ? await db.organizationRole.findMany({
        where: { organizationId, name: { in: customNames } },
        select: { name: true, permissions: true },
      })
    : [];
  const permissionsByName = new Map(
    customRoles.map((role) => [
      role.name,
      parseCustomPermissions(role.permissions),
    ]),
  );
  const hasMemberWrite = ['create', 'read', 'update', 'delete'].every(
    (action) => callerPermissions.member?.includes(action),
  );
  for (const role of targetRoles) {
    if (isRestrictedRole(role)) continue;
    if (Object.hasOwn(BUILT_IN_ROLE_PERMISSIONS, role)) {
      if (!hasMemberWrite)
        throw new ForbiddenException(
          `You cannot assign privileged role "${role}"`,
        );
      continue;
    }
    const permissions = permissionsByName.get(role);
    if (!permissions)
      throw new BadRequestException(`Unknown organization role "${role}"`);
    const exceedsAuthority = Object.entries(permissions).some(
      ([resource, actions]) =>
        actions.some(
          (action) => !callerPermissions[resource]?.includes(action),
        ),
    );
    if (exceedsAuthority) {
      throw new ForbiddenException(
        `Role "${role}" exceeds your effective permissions`,
      );
    }
  }
}
