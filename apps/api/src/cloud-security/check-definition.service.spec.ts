import { normalizeCheckId } from './check-definition.utils';

// We test the pure-function exports here. The full CheckDefinitionService
// orchestration (db + ai) is covered by integration patterns; this file
// focuses on the normalization logic that determines cache identity —
// getting that wrong silently breaks the per-org cache.

describe('normalizeCheckId', () => {
  it('returns the input unchanged when resourceId is null', () => {
    expect(normalizeCheckId('iam-no-password-policy', null)).toBe(
      'iam-no-password-policy',
    );
  });

  it('strips a resource-specific suffix matching the resourceId', () => {
    expect(normalizeCheckId('iam-no-mfa-john', 'john')).toBe('iam-no-mfa');
    expect(normalizeCheckId('cloudtrail-not-logging-prod-trail', 'prod-trail')).toBe(
      'cloudtrail-not-logging',
    );
  });

  it('returns input unchanged when resourceId is "account-level"', () => {
    // Fixed-id checks use 'account-level' as a placeholder resourceId.
    // No suffix to strip.
    expect(normalizeCheckId('iam-no-password-policy', 'account-level')).toBe(
      'iam-no-password-policy',
    );
  });

  it('handles compound resourceIds by trying each path segment', () => {
    // e.g. AWS API Gateway uses "${apiId}/${routeKey}" as resourceId.
    expect(
      normalizeCheckId('apigw-no-auth-abc123-route-1', 'abc123/route-1'),
    ).toBe('apigw-no-auth-abc123');
  });

  it('returns the input unchanged when no suffix can be matched', () => {
    expect(normalizeCheckId('iam-no-mfa', 'unrelated-resource')).toBe(
      'iam-no-mfa',
    );
  });

  it('preserves uniqueness across DIFFERENT check types for the same resource', () => {
    // Sanity: two findings on the same resource but different checks should
    // normalize to different keys so the cache stays correct.
    expect(normalizeCheckId('iam-no-mfa-john', 'john')).not.toBe(
      normalizeCheckId('iam-no-access-keys-john', 'john'),
    );
  });

  it('produces the same normalized key for two resources of the same check', () => {
    // The cache benefit: different users, same check → one cache entry.
    expect(normalizeCheckId('iam-no-mfa-john', 'john')).toBe(
      normalizeCheckId('iam-no-mfa-alice', 'alice'),
    );
  });
});
