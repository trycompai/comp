import { createAccessControl } from 'better-auth/plugins/access';

const statement = {
  app: ['create', 'update', 'delete', 'read'],
  member: ['create', 'update'],
  invitation: ['create', 'cancel'],
  portal: ['read', 'update'],
  organization: ['update', 'delete', 'read'],
} as const;

export const ac = createAccessControl(statement);

/**
 * Owner role with full permissions to manage all resources
 * Has complete control over apps, organizations, members, invitations, and portal
 */
export const owner = ac.newRole({
  app: ['create', 'update', 'delete', 'read'],
  organization: ['update', 'delete'],
  member: ['create', 'update'],
  invitation: ['create', 'cancel'],
  portal: ['read', 'update'],
});

/**
 * Admin role with permissions to manage most resources
 * Can manage apps, portal settings, members and invitations, but has limited organization access
 */
export const admin = ac.newRole({
  app: ['create', 'update', 'delete', 'read'],
  portal: ['read', 'update'],
  member: ['create', 'update'],
  invitation: ['create', 'cancel'],
});

/**
 * Auditor role with read-only access
 * Can only view apps and organization information for compliance purposes
 */
export const auditor = ac.newRole({
  app: ['read'],
  organization: ['read'],
});

/**
 * Employee role with standard operational permissions
 * Can manage portal, read/update organization info, manage members and invitations, and work with apps
 */
export const employee = ac.newRole({
  portal: ['read', 'update'],
});

/**
 * Contractor role with same permissions as employee
 * Can manage portal for compliance purposes
 */
export const contractor = ac.newRole({
  portal: ['read', 'update'],
});

export const allRoles = { owner, admin, auditor, employee, contractor } as const;
