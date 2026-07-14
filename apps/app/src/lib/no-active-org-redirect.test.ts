import { describe, it, expect } from 'vitest';
import { resolveNoActiveOrgRedirect } from './no-active-org-redirect';

describe('resolveNoActiveOrgRedirect (CS-569)', () => {
  it('routes a pending invitation to the invite — highest precedence', () => {
    expect(
      resolveNoActiveOrgRedirect({
        pendingInvitation: { id: 'inv_1' },
        hasInactiveMembership: true,
      }),
    ).toBe('/invite/inv_1');
  });

  it('routes an offboarded user (no invite) to access-removed', () => {
    expect(
      resolveNoActiveOrgRedirect({ pendingInvitation: null, hasInactiveMembership: true }),
    ).toBe('/auth/access-removed');
  });

  it('returns null for a genuinely new user so the caller onboards them', () => {
    expect(
      resolveNoActiveOrgRedirect({ pendingInvitation: null, hasInactiveMembership: false }),
    ).toBeNull();
  });

  it('is null-safe when the /v1/auth/me payload is missing (degrade to onboarding)', () => {
    expect(resolveNoActiveOrgRedirect(undefined)).toBeNull();
    expect(resolveNoActiveOrgRedirect(null)).toBeNull();
    expect(resolveNoActiveOrgRedirect({})).toBeNull();
  });
});
