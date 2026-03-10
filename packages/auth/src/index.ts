export {
  ac,
  statement,
  owner,
  admin,
  auditor,
  employee,
  contractor,
  allRoles,
  ROLE_HIERARCHY,
  RESTRICTED_ROLES,
  PRIVILEGED_ROLES,
  BUILT_IN_ROLE_PERMISSIONS,
  BUILT_IN_ROLE_OBLIGATIONS,
  type RoleName,
  type RoleObligations,
} from './permissions';

export { createAuthServer, type CreateAuthServerOptions, type AuthServer } from './server';
