import { createAccessControl } from 'better-auth/plugins/access';
import {
  defaultStatements,
  ownerAc,
  adminAc,
} from 'better-auth/plugins/organization/access';

/**
 * Permission statement for the Employee Portal
 * Extends better-auth's defaults with GRC resources
 *
 * Note: This should be kept in sync with apps/app/src/utils/permissions.ts
 */
const statement = {
  ...defaultStatements,
  organization: ['read', 'update', 'delete'],
  // GRC Resources
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
  // Legacy
  app: ['create', 'read', 'update', 'delete'],
  portal: ['read', 'update'],
} as const;

export const ac = createAccessControl(statement);

/**
 * Owner role - Full access
 */
export const owner = ac.newRole({
  ...ownerAc.statements,
  organization: ['read', 'update', 'delete'],
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
  app: ['create', 'read', 'update', 'delete'],
  portal: ['read', 'update'],
});

/**
 * Admin role - Full access except org deletion
 */
export const admin = ac.newRole({
  ...adminAc.statements,
  organization: ['read', 'update'],
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
  app: ['create', 'read', 'update', 'delete'],
  portal: ['read', 'update'],
});

/**
 * Program Manager role - Full GRC access, no member management
 */
export const program_manager = ac.newRole({
  organization: ['read'],
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
  integration: ['read'],
  app: ['read'],
  portal: ['read', 'update'],
});

/**
 * Auditor role - Read-only with export
 */
export const auditor = ac.newRole({
  organization: ['read'],
  member: ['create'],
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
  portal: ['read'],
});

/**
 * Employee role - Limited access, assignment-based
 * This is the primary role used in the employee portal
 */
export const employee = ac.newRole({
  task: ['read', 'complete'],
  evidence: ['read', 'upload'],
  policy: ['read'],
  questionnaire: ['read', 'respond'],
  portal: ['read', 'update'],
});

/**
 * Contractor role - Same as employee
 */
export const contractor = ac.newRole({
  task: ['read', 'complete'],
  evidence: ['read', 'upload'],
  policy: ['read'],
  portal: ['read', 'update'],
});

/**
 * All available roles
 */
export const allRoles = {
  owner,
  admin,
  program_manager,
  auditor,
  employee,
  contractor,
} as const;

/**
 * Roles that require assignment-based filtering
 */
export const RESTRICTED_ROLES = ['employee', 'contractor'] as const;

/**
 * Roles that have full access without assignment filtering
 */
export const PRIVILEGED_ROLES = [
  'owner',
  'admin',
  'program_manager',
  'auditor',
] as const;
