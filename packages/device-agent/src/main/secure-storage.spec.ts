import { describe, it, expect, vi, beforeEach } from 'vitest';

const encryptStringMock = vi.fn();
const decryptStringMock = vi.fn();
const isEncryptionAvailableMock = vi.fn();

vi.mock('electron', () => ({
  safeStorage: {
    encryptString: (s: string) => encryptStringMock(s),
    decryptString: (b: Buffer) => decryptStringMock(b),
    isEncryptionAvailable: () => isEncryptionAvailableMock(),
  },
}));

describe('secureStoreToken / secureReadToken', () => {
  beforeEach(() => {
    encryptStringMock.mockReset();
    decryptStringMock.mockReset();
    isEncryptionAvailableMock.mockReset();
  });

  it('encrypts with safeStorage when available and marks the blob encrypted', async () => {
    isEncryptionAvailableMock.mockReturnValue(true);
    encryptStringMock.mockReturnValue(Buffer.from('enc-bytes'));
    const { secureStoreToken } = await import('./secure-storage');
    const blob = secureStoreToken('tok_abc');
    expect(blob).toEqual({ encrypted: true, value: 'ZW5jLWJ5dGVz' }); // base64 of 'enc-bytes'
    expect(encryptStringMock).toHaveBeenCalledWith('tok_abc');
  });

  it('falls back to plaintext when safeStorage is unavailable', async () => {
    isEncryptionAvailableMock.mockReturnValue(false);
    const { secureStoreToken } = await import('./secure-storage');
    const blob = secureStoreToken('tok_abc');
    expect(blob).toEqual({ encrypted: false, value: 'tok_abc' });
    expect(encryptStringMock).not.toHaveBeenCalled();
  });

  it('decrypts encrypted blobs via safeStorage', async () => {
    decryptStringMock.mockReturnValue('tok_abc');
    const { secureReadToken } = await import('./secure-storage');
    const value = secureReadToken({ encrypted: true, value: 'ZW5jLWJ5dGVz' });
    expect(value).toBe('tok_abc');
    expect(decryptStringMock).toHaveBeenCalledWith(Buffer.from('enc-bytes'));
  });

  it('reads plaintext blobs when not encrypted', async () => {
    const { secureReadToken } = await import('./secure-storage');
    const value = secureReadToken({ encrypted: false, value: 'tok_abc' });
    expect(value).toBe('tok_abc');
  });

  it('returns null when blob is null/undefined', async () => {
    const { secureReadToken } = await import('./secure-storage');
    expect(secureReadToken(null)).toBeNull();
    expect(secureReadToken(undefined)).toBeNull();
  });

  it('returns null when decryption fails (corrupted blob)', async () => {
    decryptStringMock.mockImplementation(() => { throw new Error('decrypt failed'); });
    const { secureReadToken } = await import('./secure-storage');
    const value = secureReadToken({ encrypted: true, value: 'YmFk' });
    expect(value).toBeNull();
  });
});
