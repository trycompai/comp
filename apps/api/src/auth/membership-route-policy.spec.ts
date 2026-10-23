jest.mock('better-auth/api', () => ({
  APIError: class APIError extends Error {
    constructor(
      readonly status: string,
      readonly body: Record<string, unknown>,
    ) {
      super(status);
    }
  },
}));

import { Logger } from '@nestjs/common';
import { APIError } from 'better-auth/api';
import { assertMembershipRouteAllowed } from './membership-route-policy';

describe('assertMembershipRouteAllowed', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('refuses /organization/update-member-role with a generic 403', () => {
    const path = '/organization/update-member-role';
    let thrown: unknown;
    try {
      assertMembershipRouteAllowed(path);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(APIError);
    expect(thrown).toMatchObject({ status: 'FORBIDDEN' });
    const { body } = thrown as APIError;
    expect(body).toEqual({ message: 'Forbidden' });
    const serialized = JSON.stringify(body).toLowerCase();
    for (const hint of ['people', 'role', 'endpoint', '/v1']) {
      expect(serialized).not.toContain(hint);
    }
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(path));
  });

  it.each([
    '/organization/add-member',
    '/organization/accept-invitation',
    '/organization/invite-member',
    '/organization/list-members',
    '/organization/set-active',
    '/get-session',
    '/sign-in/magic-link',
  ])('lets %s through', (path) => {
    expect(() => assertMembershipRouteAllowed(path)).not.toThrow();
  });
});
