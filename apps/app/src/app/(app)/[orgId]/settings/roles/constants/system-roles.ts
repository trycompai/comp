import { BUILT_IN_ROLE_PERMISSIONS } from '@comp/auth';

export interface SystemRole {
  name: string;
  key: string;
  description: string;
}

export const SYSTEM_ROLES: SystemRole[] = [
  {
    name: 'Owner',
    key: 'owner',
    description: 'Full access to everything including organization deletion',
  },
  {
    name: 'Admin',
    key: 'admin',
    description: 'Full access except organization deletion',
  },
  {
    name: 'Auditor',
    key: 'auditor',
    description: 'Read-only with export capabilities and findings management',
  },
  {
    name: 'Employee',
    key: 'employee',
    description: 'Assigned tasks, evidence uploads, and employee portal',
  },
  {
    name: 'Contractor',
    key: 'contractor',
    description: 'External contractor access, similar to employee',
  },
];

/**
 * Built-in role permissions — re-exported from @comp/auth (single source of truth).
 * These are read-only and cannot be modified by users.
 */
export const SYSTEM_ROLE_PERMISSIONS = BUILT_IN_ROLE_PERMISSIONS;
