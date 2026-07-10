import {
  PLATFORM_ADMIN_ROLE as AUTH_PLATFORM_ADMIN_ROLE,
  isOrgParticipant as authIsOrgParticipant,
} from '@trycompai/auth/participation';
import { describe, expect, it } from 'vitest';
import { isOrgParticipant, PLATFORM_ADMIN_ROLE } from './org-participation-rule';

describe('isOrgParticipant', () => {
  it('excludes platform admins in a customer org', () => {
    expect(isOrgParticipant(PLATFORM_ADMIN_ROLE, { orgIsInternal: false })).toBe(false);
  });

  it('includes platform admins in an internal org', () => {
    expect(isOrgParticipant(PLATFORM_ADMIN_ROLE, { orgIsInternal: true })).toBe(true);
  });

  it('includes non-admin roles in any org', () => {
    expect(isOrgParticipant('user', { orgIsInternal: false })).toBe(true);
    expect(isOrgParticipant('owner', { orgIsInternal: false })).toBe(true);
  });

  it('treats null/undefined roles as participants (not platform admins)', () => {
    expect(isOrgParticipant(null, { orgIsInternal: false })).toBe(true);
    expect(isOrgParticipant(undefined, { orgIsInternal: false })).toBe(true);
  });

  it('includes everyone in an internal org', () => {
    expect(isOrgParticipant('admin', { orgIsInternal: true })).toBe(true);
    expect(isOrgParticipant('user', { orgIsInternal: true })).toBe(true);
    expect(isOrgParticipant(null, { orgIsInternal: true })).toBe(true);
  });
});

// Drift guard: this app-local rule is a deliberate dependency-free mirror of
// `@trycompai/auth/participation` (the app can't import the auth index from
// Trigger.dev-bundled files). Fail CI if the two ever diverge.
describe('org-participation rule stays in sync with @trycompai/auth', () => {
  const roles: Array<string | null | undefined> = [
    'admin',
    'owner',
    'user',
    'auditor',
    '',
    null,
    undefined,
  ];

  it('matches the canonical predicate for every role × internal flag', () => {
    expect(PLATFORM_ADMIN_ROLE).toBe(AUTH_PLATFORM_ADMIN_ROLE);
    for (const role of roles) {
      for (const orgIsInternal of [true, false]) {
        expect(isOrgParticipant(role, { orgIsInternal })).toBe(
          authIsOrgParticipant(role, { orgIsInternal }),
        );
      }
    }
  });
});
