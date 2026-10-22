import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decrypt, encrypt } from './encryption';

function readDirective(source: string): string | undefined {
  return source.trimStart().match(/^['"](use (?:client|server))['"]/)?.[1];
}

describe('encryption', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key';
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ENCRYPTION_KEY;
      return;
    }
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it('round-trips a value', async () => {
    const encrypted = await encrypt('client-secret-value');

    expect(encrypted.encrypted).not.toContain('client-secret-value');
    await expect(decrypt(encrypted)).resolves.toBe('client-secret-value');
  });

  it('has no module directive', () => {
    const source = readFileSync(join(__dirname, 'encryption.ts'), 'utf8');

    expect(readDirective(source)).toBeUndefined();
    expect(source).toMatch(/^import 'server-only';/);
  });
});
