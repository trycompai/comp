// Set SECRET_KEY before module load (validateSecurityConfig runs at import time)
process.env.SECRET_KEY = 'test-secret-key-that-is-32-chars!';

// Mock all dependencies before imports
jest.mock('@trycompai/db', () => ({
  db: {
    jwks: {
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    // Stubs required by auth.server.ts module initialization
    organization: { findFirst: jest.fn() },
    member: { findFirst: jest.fn() },
  },
}));

jest.mock('better-auth/crypto', () => ({
  symmetricDecrypt: jest.fn(),
}));

// Mock better-auth and its plugins to avoid ESM import issues
jest.mock('better-auth', () => ({
  betterAuth: jest.fn(() => ({})),
}));

jest.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: jest.fn(),
}));

jest.mock('better-auth/plugins', () => ({
  bearer: jest.fn(() => ({})),
  emailOTP: jest.fn(() => ({})),
  jwt: jest.fn(() => ({})),
  magicLink: jest.fn(() => ({})),
  multiSession: jest.fn(() => ({})),
  organization: jest.fn(() => ({})),
}));

jest.mock('better-auth/plugins/access', () => ({
  createAccessControl: jest.fn(() => ({
    newRole: jest.fn(() => ({})),
  })),
}));

jest.mock('better-auth/plugins/organization/access', () => ({
  defaultStatements: {},
  adminAc: { statements: {} },
  ownerAc: { statements: {} },
}));

jest.mock('@trycompai/email', () => ({
  MagicLinkEmail: jest.fn(),
  OTPVerificationEmail: jest.fn(),
  sendInviteMemberEmail: jest.fn(),
  sendEmail: jest.fn(),
}));

import { db } from '@trycompai/db';
import { symmetricDecrypt } from 'better-auth/crypto';
import { cleanupStaleJwks } from './auth.server';

const mockDb = db as jest.Mocked<typeof db>;
const mockDecrypt = symmetricDecrypt as jest.Mock;

describe('cleanupStaleJwks', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, SECRET_KEY: 'test-secret-key-that-is-32-chars!' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should do nothing when SECRET_KEY is not set', async () => {
    delete process.env.SECRET_KEY;

    await cleanupStaleJwks();

    expect(mockDb.jwks.findFirst).not.toHaveBeenCalled();
  });

  it('should do nothing when no JWKS records exist', async () => {
    (mockDb.jwks.findFirst as jest.Mock).mockResolvedValue(null);

    await cleanupStaleJwks();

    expect(mockDb.jwks.findFirst).toHaveBeenCalled();
    expect(mockDecrypt).not.toHaveBeenCalled();
    expect(mockDb.jwks.deleteMany).not.toHaveBeenCalled();
  });

  it('should do nothing when decryption succeeds (secret matches)', async () => {
    (mockDb.jwks.findFirst as jest.Mock).mockResolvedValue({
      id: 'jwk_123',
      publicKey: '{"kty":"OKP"}',
      privateKey: 'encrypted-data',
      createdAt: new Date(),
    });
    mockDecrypt.mockResolvedValue('decrypted-private-key');

    await cleanupStaleJwks();

    expect(mockDecrypt).toHaveBeenCalledWith({
      key: 'test-secret-key-that-is-32-chars!',
      data: 'encrypted-data',
    });
    expect(mockDb.jwks.deleteMany).not.toHaveBeenCalled();
  });

  it('should delete all JWKS when decryption fails (secret changed)', async () => {
    (mockDb.jwks.findFirst as jest.Mock).mockResolvedValue({
      id: 'jwk_123',
      publicKey: '{"kty":"OKP"}',
      privateKey: 'encrypted-with-old-secret',
      createdAt: new Date(),
    });
    mockDecrypt.mockRejectedValue(new Error('Decryption failed'));

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    await cleanupStaleJwks();

    expect(mockDb.jwks.deleteMany).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('encrypted with a different secret'),
    );

    warnSpy.mockRestore();
  });

  it('should handle database errors gracefully', async () => {
    (mockDb.jwks.findFirst as jest.Mock).mockRejectedValue(
      new Error('Connection refused'),
    );

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    await cleanupStaleJwks();

    // Should not throw
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('JWKS startup check'),
      expect.any(Error),
    );

    errorSpy.mockRestore();
  });

  it('should handle deleteMany failure gracefully', async () => {
    (mockDb.jwks.findFirst as jest.Mock).mockResolvedValue({
      id: 'jwk_123',
      publicKey: '{"kty":"OKP"}',
      privateKey: 'encrypted-with-old-secret',
      createdAt: new Date(),
    });
    mockDecrypt.mockRejectedValue(new Error('Decryption failed'));
    (mockDb.jwks.deleteMany as jest.Mock).mockRejectedValue(
      new Error('Delete failed'),
    );

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    await cleanupStaleJwks();

    // Should not throw — outer catch handles it
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
