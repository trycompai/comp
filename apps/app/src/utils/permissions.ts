/**
 * Re-export all permissions from the shared @trycompai/auth package.
 * This ensures a single source of truth for role definitions.
 */
export {
  ac,
  owner,
  admin,
  auditor,
  employee,
  contractor,
  allRoles,
  ROLE_HIERARCHY,
  RESTRICTED_ROLES,
  PRIVILEGED_ROLES,
  type RoleName,
} from '@trycompai/auth';
