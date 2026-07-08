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
