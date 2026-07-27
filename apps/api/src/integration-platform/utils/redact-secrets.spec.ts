import { redactSecrets } from './redact-secrets';

describe('redactSecrets', () => {
  it('redacts bearer tokens', () => {
    const out = redactSecrets(
      'failed with Authorization: Bearer abc123SECRETtoken9999',
    );
    expect(out).not.toContain('abc123SECRETtoken9999');
    expect(out).toContain('[redacted]');
  });

  it('redacts key=value secrets', () => {
    const out = redactSecrets('api_key=sk-livesomethingverysecret123456');
    expect(out).not.toContain('sk-livesomethingverysecret123456');
  });

  it('redacts quoted JSON keys/values + short secrets (not only long tokens)', () => {
    const out = redactSecrets(
      '{"api_key": "short1", "client_secret":"xyz789"}',
    );
    expect(out).not.toContain('short1');
    expect(out).not.toContain('xyz789');
    expect(redactSecrets('password=hunter2')).not.toContain('hunter2');
    expect(redactSecrets('"pwd":"p1"')).not.toContain('p1');
    // A quoted value with SPACES must be fully redacted (not just first token).
    const spaced = redactSecrets(
      '{"password": "correct horse battery staple"}',
    );
    expect(spaced).not.toContain('horse');
    expect(spaced).not.toContain('staple');
  });

  it('redacts common provider key prefixes', () => {
    expect(redactSecrets('used lin_api_B0KvAzszsMGg8Xyw')).not.toContain(
      'B0KvAzsz',
    );
    expect(redactSecrets('token ghp_abcdef 1234567890')).not.toContain(
      'ghp_abcdef',
    );
  });

  it('redacts JWTs', () => {
    const jwt = 'eyJhbGciOi.eyJzdWIiOiIxMjM0.SflKxwRJSMeKKF2QT4';
    expect(redactSecrets(`token ${jwt}`)).not.toContain('SflKxwRJSMeKKF2QT4');
  });

  it('redacts emails (PII)', () => {
    expect(redactSecrets('user jake@humanlayerlab.com failed')).not.toContain(
      'jake@humanlayerlab.com',
    );
  });

  it('redacts long opaque tokens', () => {
    expect(
      redactSecrets('subject was AKIAIOSFODNN7EXAMPLEKEY1234567890abc'),
    ).not.toContain('AKIAIOSFODNN7EXAMPLEKEY1234567890abc');
  });

  it('keeps classification-relevant words intact', () => {
    const out = redactSecrets(
      'not allowed to perform actions outside the project this key is scoped to',
    );
    expect(out).toContain('scoped to');
  });

  it('handles null/empty safely', () => {
    expect(redactSecrets(null)).toBe('');
    expect(redactSecrets(undefined)).toBe('');
    expect(redactSecrets('')).toBe('');
  });
});
