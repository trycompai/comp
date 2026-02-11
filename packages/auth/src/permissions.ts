import { createAccessControl } from 'better-auth/plugins/access';
import {
  defaultStatements,
  adminAc,
  ownerAc,
} from 'better-auth/plugins/organization/access';

/**
 * Permission statement extending better-auth's defaults with GRC resources.
 *
 * Default resources from better-auth:
 * - organization: ['update', 'delete']
 * - member: ['create', 'update', 'delete']
 * - invitation: ['create', 'delete']
 * - team: ['create', 'update', 'delete']
 * - ac: ['create', 'read', 'update', 'delete'] (for role management)
 */
export const statement = {
  ...defaultStatements,
  // Override better-auth defaults to add 'read' action
  organization: ['read', 'update', 'delete'],
  member: ['create', 'read', 'update', 'delete'],
  invitation: ['create', 'read', 'delete'],
  team: ['create', 'read', 'update', 'delete'],
  // GRC Resources — CRUD only
  control: ['create', 'read', 'update', 'delete'],
  evidence: ['create', 'read', 'update', 'delete'],
  policy: ['create', 'read', 'update', 'delete'],
  risk: ['create', 'read', 'update', 'delete'],
  vendor: ['create', 'read', 'update', 'delete'],
  task: ['create', 'read', 'update', 'delete'],
  framework: ['create', 'read', 'update', 'delete'],
  audit: ['create', 'read', 'update'],
  finding: ['create', 'read', 'update', 'delete'],
  questionnaire: ['create', 'read', 'update', 'delete'],
  integration: ['create', 'read', 'update', 'delete'],
  apiKey: ['create', 'read', 'delete'],
  // App access resources
  app: ['read'], // Main app access
  trust: ['read', 'update'], // Trust center access
} as const;

export const ac = createAccessControl(statement);

/**
 * Owner role - Full access to everything
 * Extends better-auth's ownerAc with GRC permissions
 */
export const owner = ac.newRole({
  ...ownerAc.statements,
  organization: ['read', 'update', 'delete'],
  member: ['create', 'read', 'update', 'delete'],
  invitation: ['create', 'read', 'delete'],
  team: ['create', 'read', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  // Full GRC access
  control: ['create', 'read', 'update', 'delete'],
  evidence: ['create', 'read', 'update', 'delete'],
  policy: ['create', 'read', 'update', 'delete'],
  risk: ['create', 'read', 'update', 'delete'],
  vendor: ['create', 'read', 'update', 'delete'],
  task: ['create', 'read', 'update', 'delete'],
  framework: ['create', 'read', 'update', 'delete'],
  audit: ['create', 'read', 'update'],
  finding: ['create', 'read', 'update', 'delete'],
  questionnaire: ['create', 'read', 'update', 'delete'],
  integration: ['create', 'read', 'update', 'delete'],
  apiKey: ['create', 'read', 'delete'],
  // App access
  app: ['read'],
  trust: ['read', 'update'],
});

/**
 * Admin role - Full access except organization deletion
 * Extends better-auth's adminAc with GRC permissions
 */
export const admin = ac.newRole({
  ...adminAc.statements,
  organization: ['read', 'update'], // No delete
  member: ['create', 'read', 'update', 'delete'],
  invitation: ['create', 'read', 'delete'],
  team: ['create', 'read', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  // Full GRC access
  control: ['create', 'read', 'update', 'delete'],
  evidence: ['create', 'read', 'update', 'delete'],
  policy: ['create', 'read', 'update', 'delete'],
  risk: ['create', 'read', 'update', 'delete'],
  vendor: ['create', 'read', 'update', 'delete'],
  task: ['create', 'read', 'update', 'delete'],
  framework: ['create', 'read', 'update', 'delete'],
  audit: ['create', 'read', 'update'],
  finding: ['create', 'read', 'update', 'delete'],
  questionnaire: ['create', 'read', 'update', 'delete'],
  integration: ['create', 'read', 'update', 'delete'],
  apiKey: ['create', 'read', 'delete'],
  // App access
  app: ['read'],
  trust: ['read', 'update'],
});

/**
 * Auditor role - Read-only access with export capabilities
 * Can view and export GRC data for compliance audits
 */
export const auditor = ac.newRole({
  organization: ['read'],
  member: ['create', 'read'], // Can invite other auditors + view people for audit context
  invitation: ['create', 'read'],
  // Read access to GRC resources (export maps to read)
  control: ['read'],
  evidence: ['read'],
  policy: ['read'],
  risk: ['read'],
  vendor: ['read'],
  task: ['read'],
  framework: ['read'],
  audit: ['read'],
  finding: ['create', 'read', 'update'], // Can create/update findings
  questionnaire: ['read'],
  integration: ['read'],
  // App access
  app: ['read'],
  trust: ['read'],
});

/**
 * Employee role - Limited access, assignment-based filtering
 * Can only see tasks assigned to them and complete basic compliance activities
 * Does NOT have app access - portal only
 */
export const employee = ac.newRole({
  // Portal access only — can read policies to sign them
  policy: ['read'],
});

/**
 * Contractor role - Same as employee
 * External contractors with limited compliance access
 * Does NOT have app access - portal only
 */
export const contractor = ac.newRole({
  // Portal access only — can read policies to sign them
  policy: ['read'],
});

/**
 * All available roles for the organization plugin
 */
export const allRoles = {
  owner,
  admin,
  auditor,
  employee,
  contractor,
} as const;

/**
 * Role hierarchy for privilege checking
 * Higher index = higher privilege
 */
export const ROLE_HIERARCHY = [
  'contractor',
  'employee',
  'auditor',
  'admin',
  'owner',
] as const;

/**
 * Roles that require assignment-based filtering
 */
export const RESTRICTED_ROLES = ['employee', 'contractor'] as const;

/**
 * Roles that have full access without assignment filtering
 */
export const PRIVILEGED_ROLES = ['owner', 'admin', 'auditor'] as const;

/**
 * Type for role names
 */
export type RoleName = keyof typeof allRoles;

/**
 * Built-in role permissions derived from the role definitions above.
 * Single source of truth — consumers should import this instead of hardcoding.
 */
export const BUILT_IN_ROLE_PERMISSIONS: Record<string, Record<string, string[]>> =
  Object.fromEntries(
    Object.entries(allRoles).map(([name, role]) => [
      name,
      Object.fromEntries(
        Object.entries(role.statements).map(([res, actions]) => [
          res,
          [...actions],
        ]),
      ),
    ]),
  );
