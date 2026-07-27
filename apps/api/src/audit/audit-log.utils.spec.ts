// buildChanges → constants pull Prisma enums at module load; stub @db so the
// pure redaction logic can be tested without a real client.
jest.mock('@db', () => ({
  db: {},
  AuditLogEntityType: new Proxy({}, { get: (_t, p) => p }),
  CommentEntityType: new Proxy({}, { get: (_t, p) => p }),
}));

import { buildChanges } from './audit-log.utils';

describe('buildChanges — redaction', () => {
  it('redacts the existing exact-match sensitive keys', () => {
    const changes = buildChanges(
      { password: 'p', apiKey: 'k', name: 'ok' },
      null,
      {},
    );
    expect(changes?.password.current).toBe('[REDACTED]');
    expect(changes?.apiKey.current).toBe('[REDACTED]');
    expect(changes?.name.current).toBe('ok');
  });

  it('redacts credential-named keys the exact list misses (clientSecret, secretAccessKey)', () => {
    const changes = buildChanges(
      {
        clientSecret: 'abc',
        secretAccessKey: 'xyz',
        aws_secret_access_key: 'q',
        name: 'ok',
      },
      null,
      {},
    );
    expect(changes?.clientSecret.current).toBe('[REDACTED]');
    expect(changes?.secretAccessKey.current).toBe('[REDACTED]');
    expect(changes?.aws_secret_access_key.current).toBe('[REDACTED]');
    expect(changes?.name.current).toBe('ok');
  });

  it('summarizes object elements inside arrays so secrets in generic fields cannot leak', () => {
    // e.g. browserbase `extraFields: [{ label, value }]` — `value` is a secret
    // under a non-credential key; the whole element is hidden as [Object].
    const changes = buildChanges(
      { extraFields: [{ label: 'workspace', value: 'sekret' }] },
      null,
      {},
    );
    expect(changes?.extraFields.current).toEqual(['[Object]']);
  });

  it('keeps primitive array elements (ids, scopes, tags) visible', () => {
    const changes = buildChanges({ scopes: ['read', 'write'] }, null, {});
    expect(changes?.scopes.current).toEqual(['read', 'write']);
  });

  it('keeps summarizing nested plain objects as [Object]', () => {
    const changes = buildChanges({ config: { a: 1, token: 't' } }, null, {});
    expect(changes?.config.current).toBe('[Object]');
  });

  it('leaves ordinary values untouched', () => {
    const changes = buildChanges({ status: 'active', count: 3 }, null, {});
    expect(changes?.status.current).toBe('active');
    expect(changes?.count.current).toBe(3);
  });
});
