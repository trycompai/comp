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
 * - invitation: ['create', 'cancel']
 * - team: ['create', 'update', 'delete']
 * - ac: ['create', 'read', 'update', 'delete'] (for role management)
 */
const statement = {
  ...defaultStatements,
  // Override organization to add 'read' action
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
  // App access resources
  app: ['read'], // Main app access
  portal: ['read', 'update'], // Employee portal access
} as const;

export const ac = createAccessControl(statement);

/**
 * Owner role - Full access to everything
 * Extends better-auth's ownerAc with GRC permissions
 */
export const owner = ac.newRole({
  ...ownerAc.statements,
  organization: ['read', 'update', 'delete'],
  // Full GRC access
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
  // App access
  app: ['read'],
  portal: ['read', 'update'],
});

/**
 * Admin role - Full access except organization deletion
 * Extends better-auth's adminAc with GRC permissions
 */
export const admin = ac.newRole({
  ...adminAc.statements,
  organization: ['read', 'update'], // No delete
  // Full GRC access
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
  // App access
  app: ['read'],
  portal: ['read', 'update'],
});

/**
 * Auditor role - Read-only access with export capabilities
 * Can view and export GRC data for compliance audits
 */
export const auditor = ac.newRole({
  organization: ['read'],
  member: ['create'], // Can invite other auditors
  invitation: ['create'],
  // Read + export access to GRC resources
  control: ['read', 'export'],
  evidence: ['read', 'export'],
  policy: ['read'],
  risk: ['read', 'export'],
  vendor: ['read'],
  task: ['read'],
  framework: ['read'],
  audit: ['read', 'export'],
  finding: ['create', 'read', 'update'], // Can create/update findings
  questionnaire: ['read'],
  integration: ['read'],
  // App access
  app: ['read'],
  portal: ['read'],
});

/**
 * Employee role - Limited access, assignment-based filtering
 * Can only see tasks assigned to them and complete basic compliance activities
 * Does NOT have app access - portal only
 */
export const employee = ac.newRole({
  // Assignment-filtered access (filtering handled by API layer)
  task: ['read', 'complete'],
  evidence: ['read', 'upload'],
  policy: ['read'],
  questionnaire: ['read', 'respond'],
  // Portal access only - no app access
  portal: ['read', 'update'],
});

/**
 * Contractor role - Same as employee
 * External contractors with limited compliance access
 * Does NOT have app access - portal only
 */
export const contractor = ac.newRole({
  // Assignment-filtered access (filtering handled by API layer)
  task: ['read', 'complete'],
  evidence: ['read', 'upload'],
  policy: ['read'],
  // Portal access only - no app access
  portal: ['read', 'update'],
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
