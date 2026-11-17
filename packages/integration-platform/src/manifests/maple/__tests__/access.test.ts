import { describe, expect, it } from 'bun:test';
import { apiKeyHygieneCheck } from '../checks/api-key-hygiene';
import { auditLogEvidenceCheck } from '../checks/audit-log-evidence';
import { daysAgo, fakeContext, httpError } from './fake-context';
import { makeApiKey, makeAuditEntry } from './fixtures';

describe('apiKeyHygieneCheck', () => {
  const run = async (keys: ReturnType<typeof makeApiKey>[]) => {
    const fake = fakeContext({ routes: { '/v2/api_keys': keys } });
    await apiKeyHygieneCheck.run(fake.ctx);
    return fake;
  };

  it('passes a recently used scoped key', async () => {
    const { passed, failed } = await run([makeApiKey()]);
    expect(failed).toEqual([]);
    expect(passed).toEqual(['key_1', 'api-keys-summary']);
  });

  it('fails a key unused past the limit', async () => {
    const { failed } = await run([makeApiKey({ last_used_at: daysAgo(120) })]);
    expect(failed).toEqual(['key_1']);
  });

  it('fails a never-used key created past the limit', async () => {
    const { failed } = await run([makeApiKey({ last_used_at: null, created_at: daysAgo(100) })]);
    expect(failed).toEqual(['key_1']);
  });

  it('fails an old full-access key but not an old scoped one', async () => {
    const { failed } = await run([
      makeApiKey({ id: 'key_full', scopes: null, created_at: daysAgo(400) }),
      makeApiKey({ id: 'key_star', scopes: ['*'], created_at: daysAgo(400) }),
      makeApiKey({ id: 'key_scoped', created_at: daysAgo(400) }),
    ]);
    expect(failed).toEqual(['key_full', 'key_star']);
  });

  it('skips revoked and expired keys', async () => {
    const { passed, failed } = await run([
      makeApiKey({ id: 'key_revoked', revoked: true, last_used_at: daysAgo(500) }),
      makeApiKey({ id: 'key_expired', expires_at: daysAgo(1), last_used_at: daysAgo(500) }),
    ]);
    expect(failed).toEqual([]);
    expect(passed).toEqual(['api-keys-summary']);
  });

  it('honours custom limits', async () => {
    const fake = fakeContext({
      routes: { '/v2/api_keys': [makeApiKey({ last_used_at: daysAgo(10) })] },
      variables: { max_unused_days: '7' },
    });
    await apiKeyHygieneCheck.run(fake.ctx);
    expect(fake.failed).toEqual(['key_1']);
  });
});

describe('auditLogEvidenceCheck', () => {
  it('passes with evidence and requests the configured window', async () => {
    const fake = fakeContext({
      routes: { '/v2/audit_log': [makeAuditEntry()] },
      variables: { audit_window_days: 7 },
    });
    await auditLogEvidenceCheck.run(fake.ctx);
    expect(fake.passed).toEqual(['audit-log']);
    expect(fake.failed).toEqual([]);
    expect(fake.calls.map((c) => c.params?.outcome)).toEqual([undefined, 'denied']);
    const since = Date.parse(fake.calls[0]?.params?.since ?? '');
    expect(Math.round((Date.now() - since) / 86_400_000)).toBe(7);
  });

  it('flags denied actions', async () => {
    const fake = fakeContext({
      routes: { '/v2/audit_log': [makeAuditEntry({ outcome: 'denied', denial_reason: 'role' })] },
    });
    await auditLogEvidenceCheck.run(fake.ctx);
    expect(fake.failed).toEqual(['audit-log-denied']);
    expect(fake.passed).toEqual(['audit-log']);
  });

  it('reports an invalid key instead of throwing', async () => {
    const fake = fakeContext({ routes: { '/v2/audit_log': httpError(401) } });
    await auditLogEvidenceCheck.run(fake.ctx);
    expect(fake.failed).toEqual(['audit log']);
  });
});
