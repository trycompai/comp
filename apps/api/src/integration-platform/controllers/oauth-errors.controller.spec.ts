jest.mock('@db', () => ({
  db: { integrationOAuthError: { create: jest.fn() } },
}));
// The real auth guards import better-auth, which fails to load under jest's ESM
// shim. Mock them so the controller module can be imported; they're not under
// test here (we test the record() handler logic).
jest.mock('../../auth/hybrid-auth.guard', () => ({ HybridAuthGuard: class {} }));
jest.mock('../../auth/permission.guard', () => ({ PermissionGuard: class {} }));
jest.mock('../../auth/require-permission.decorator', () => ({
  RequirePermission: () => () => undefined,
}));
jest.mock('../../auth/auth-context.decorator', () => ({
  OrganizationId: () => () => undefined,
  UserId: () => () => undefined,
}));

import { db } from '@db';
import { OAuthErrorsController } from './oauth-errors.controller';

const mockedDb = db as unknown as {
  integrationOAuthError: { create: jest.Mock };
};

describe('OAuthErrorsController', () => {
  afterEach(() => jest.clearAllMocks());

  it('records an OAuth error scoped to the org + user', async () => {
    mockedDb.integrationOAuthError.create.mockResolvedValue({});
    const controller = new OAuthErrorsController();

    const res = await controller.record('org_1', 'user_1', {
      providerSlug: 'quickbooks-online',
      error: 'token_exchange_failed',
      errorDescription: 'Sandbox app not allowed',
    });

    expect(res).toEqual({ recorded: true });
    expect(mockedDb.integrationOAuthError.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org_1',
        userId: 'user_1',
        providerSlug: 'quickbooks-online',
        errorCode: 'token_exchange_failed',
        errorDescription: 'Sandbox app not allowed',
      },
    });
  });

  it('handles a missing user and missing optional fields (nulls, no secrets)', async () => {
    mockedDb.integrationOAuthError.create.mockResolvedValue({});
    const controller = new OAuthErrorsController();

    await controller.record('org_2', undefined, { providerSlug: 'zoho-crm' });

    expect(mockedDb.integrationOAuthError.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org_2',
        userId: null,
        providerSlug: 'zoho-crm',
        errorCode: null,
        errorDescription: null,
      },
    });
  });
});
