import { safeStorage } from 'electron';

export interface SecureTokenBlob {
  encrypted: boolean;
  /** base64 when encrypted, raw string when not. */
  value: string;
}

export function secureStoreToken(token: string): SecureTokenBlob {
  if (safeStorage.isEncryptionAvailable()) {
    const buf = safeStorage.encryptString(token);
    return { encrypted: true, value: buf.toString('base64') };
  }
  return { encrypted: false, value: token };
}

export function secureReadToken(
  blob: SecureTokenBlob | null | undefined,
): string | null {
  if (!blob) return null;
  if (!blob.encrypted) return blob.value;
  try {
    const buf = Buffer.from(blob.value, 'base64');
    return safeStorage.decryptString(buf);
  } catch {
    return null;
  }
}
