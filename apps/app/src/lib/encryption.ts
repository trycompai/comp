'use server';

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  salt: string;
}

// Simple key derivation using Node's built-in scrypt instead of argon2
async function deriveKey(secret: string, salt: Buffer): Promise<Buffer> {
  return scryptSync(secret, salt, KEY_LENGTH, {
    // These are reasonable defaults for scrypt
    N: 16384,
    r: 8,
    p: 1,
  });
}

export async function encrypt(text: string): Promise<EncryptedData> {
  const secretKey = process.env.SECRET_KEY;

  if (!secretKey) {
    throw new Error('SECRET_KEY environment variable is not set');
  }

  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = await deriveKey(secretKey, salt);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

  const tag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    salt: salt.toString('base64'),
  };
}

export async function decrypt(encryptedData: EncryptedData): Promise<string> {
  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) {
    throw new Error('SECRET_KEY environment variable is not set');
  }

  const encrypted = Buffer.from(encryptedData.encrypted, 'base64');
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const tag = Buffer.from(encryptedData.tag, 'base64');
  const salt = Buffer.from(encryptedData.salt, 'base64');

  const key = await deriveKey(secretKey, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString('utf8');
}

export async function encryptObject<T extends object>(obj: T): Promise<T> {
  const encrypted: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      encrypted[key] = await encrypt(value);
    } else if (typeof value === 'object' && value !== null) {
      encrypted[key] = await encryptObject(value);
    } else {
      encrypted[key] = value;
    }
  }

  return encrypted as T;
}

export async function decryptObject<T extends object>(obj: T): Promise<T> {
  const decrypted: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && 'encrypted' in value) {
      decrypted[key] = await decrypt(value as EncryptedData);
    } else if (typeof value === 'object' && value !== null) {
      decrypted[key] = await decryptObject(value);
    } else {
      decrypted[key] = value;
    }
  }

  return decrypted as T;
}
