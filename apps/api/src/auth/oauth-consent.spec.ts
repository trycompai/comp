const mockVerificationFindFirst = jest.fn();
const mockApplicationFindUnique = jest.fn();

jest.mock('@db', () => ({
  db: {
    verification: {
      findFirst: (...a: unknown[]) => mockVerificationFindFirst(...a),
    },
    oauthApplication: {
      findUnique: (...a: unknown[]) => mockApplicationFindUnique(...a),
    },
  },
}));

jest.mock('./hybrid-auth.guard', () => ({ HybridAuthGuard: class {} }));
jest.mock('./permission.guard', () => ({
  PermissionGuard: class {},
  PERMISSIONS_KEY: 'permissions',
}));
jest.mock('./app-access', () => ({ resolveRolePermissions: jest.fn() }));

import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthController } from './auth.controller';
import { getPendingConsent, OAuthConsentQueryDto } from './oauth-consent';
import { SessionOnlyGuard } from './session-only.guard';
import { SKIP_ORG_CHECK_KEY } from './skip-org-check.decorator';

const CODE = 'AbCdEf0123456789AbCdEf0123456789';

function pendingRecord(overrides: Record<string, unknown> = {}) {
  return {
    value: JSON.stringify({
      clientId: 'client_1',
      redirectURI: 'https://client.example.com/callback',
      scope: ['openid'],
      userId: 'user_1',
      requireConsent: true,
      ...overrides,
    }),
    expiresAt: new Date(Date.now() + 60_000),
  };
}

describe('getPendingConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerificationFindFirst.mockResolvedValue(pendingRecord());
    mockApplicationFindUnique.mockResolvedValue({
      name: 'Client App',
      disabled: false,
    });
  });

  it('returns the app name and destination for the owner', async () => {
    await expect(
      getPendingConsent({ consentCode: CODE, userId: 'user_1' }),
    ).resolves.toEqual({
      clientName: 'Client App',
      redirectUri: 'https://client.example.com/callback',
    });
    expect(mockVerificationFindFirst).toHaveBeenCalledWith({
      where: { identifier: CODE },
      orderBy: { createdAt: 'desc' },
      select: { value: true, expiresAt: true },
    });
    expect(mockApplicationFindUnique).toHaveBeenCalledWith({
      where: { clientId: 'client_1' },
      select: { name: true, disabled: true },
    });
  });

  it.each([
    [
      'there is no pending record',
      () => mockVerificationFindFirst.mockResolvedValue(null),
    ],
    [
      'the record has expired',
      () =>
        mockVerificationFindFirst.mockResolvedValue({
          ...pendingRecord(),
          expiresAt: new Date(Date.now() - 1000),
        }),
    ],
    [
      'the record belongs to another user',
      () =>
        mockVerificationFindFirst.mockResolvedValue(
          pendingRecord({ userId: 'user_2' }),
        ),
    ],
    [
      'the record is no longer waiting for approval',
      () =>
        mockVerificationFindFirst.mockResolvedValue(
          pendingRecord({ requireConsent: false }),
        ),
    ],
    [
      'the record is not an authorization',
      () =>
        mockVerificationFindFirst.mockResolvedValue({
          value: 'not json',
          expiresAt: new Date(Date.now() + 60_000),
        }),
    ],
    [
      'the client no longer exists',
      () => mockApplicationFindUnique.mockResolvedValue(null),
    ],
    [
      'the client is disabled',
      () =>
        mockApplicationFindUnique.mockResolvedValue({
          name: 'Client App',
          disabled: true,
        }),
    ],
  ])('responds with a generic not found when %s', async (_label, arrange) => {
    arrange();
    await expect(
      getPendingConsent({ consentCode: CODE, userId: 'user_1' }),
    ).rejects.toThrow(new NotFoundException());
  });
});

describe('OAuthConsentQueryDto', () => {
  it.each([
    [CODE, 0],
    ['short', 1],
    ['has spaces in it but is long enough', 1],
    [`${CODE}&x=1`, 1],
  ])('validates %p', async (consentCode, expectedErrors) => {
    const dto = plainToInstance(OAuthConsentQueryDto, {
      consent_code: consentCode,
    });
    expect(await validate(dto)).toHaveLength(expectedErrors);
  });
});

describe('AuthController.getOAuthConsent', () => {
  const handler: object = Object.getOwnPropertyDescriptor(
    AuthController.prototype,
    'getOAuthConsent',
  )?.value;

  it('only accepts browser sessions and does not need an active organization', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      SessionOnlyGuard,
    ]);
    expect(Reflect.getMetadata(SKIP_ORG_CHECK_KEY, handler)).toBe(true);
  });

  it('looks up the pending authorization for the signed-in user', async () => {
    mockVerificationFindFirst.mockResolvedValue(pendingRecord());
    mockApplicationFindUnique.mockResolvedValue({
      name: 'Client App',
      disabled: false,
    });

    await expect(
      new AuthController().getOAuthConsent('user_1', { consent_code: CODE }),
    ).resolves.toEqual({
      clientName: 'Client App',
      redirectUri: 'https://client.example.com/callback',
    });
  });
});
