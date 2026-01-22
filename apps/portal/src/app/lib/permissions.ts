import { createAccessControl } from 'better-auth/plugins/access';

const statement = {
  app: ['create', 'update', 'delete', 'read'],
  member: ['create', 'update'],
  invitation: ['create', 'cancel'],
  portal: ['read', 'update'],
  organization: ['update', 'delete', 'read'],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  app: ['create', 'update', 'delete', 'read'],
  organization: ['update', 'delete'],
  member: ['create', 'update'],
  invitation: ['create', 'cancel'],
  portal: ['read', 'update'],
});

export const admin = ac.newRole({
  app: ['create', 'update', 'delete', 'read'],
  portal: ['read', 'update'],
  member: ['create', 'update'],
  invitation: ['create', 'cancel'],
});

export const member = ac.newRole({
  app: ['update', 'read'],
  portal: ['read', 'update'],
  organization: ['read'],
});

export const auditor = ac.newRole({
  app: ['read'],
  organization: ['read'],
});

export const employee = ac.newRole({
  portal: ['read', 'update'],
  organization: ['read', 'update'],
  member: ['create', 'update'],
  invitation: ['create', 'cancel'],
  app: ['read', 'update'],
});

export const contractor = ac.newRole({
  portal: ['read', 'update'],
  organization: ['read', 'update'],
  member: ['create', 'update'],
  invitation: ['create', 'cancel'],
  app: ['read', 'update'],
});
