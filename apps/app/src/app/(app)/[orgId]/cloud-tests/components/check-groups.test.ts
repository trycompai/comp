import { describe, expect, it } from 'vitest';
import { buildCheckGroups, deriveCheckTitle } from './check-groups';
import type { Finding } from '../types';

function makeFinding(overrides: Partial<Finding>): Finding {
  return {
    id: 'icx_test',
    title: 'A finding',
    description: null,
    remediation: null,
    status: 'failed',
    severity: 'medium',
    serviceId: 'iam',
    findingKey: null,
    resourceId: null,
    resourceType: null,
    checkId: null,
    checkKey: null,
    evidence: null,
    projectDisplayName: null,
    completedAt: null,
    connectionId: 'icn_test',
    providerSlug: 'aws',
    integration: { integrationId: 'aws' },
    ...overrides,
  };
}

describe('deriveCheckTitle', () => {
  it('strips a quoted resourceId from the title', () => {
    const f = makeFinding({
      title: 'IAM user "john" does not have MFA enabled',
      resourceId: 'john',
    });
    expect(deriveCheckTitle(f)).toBe('IAM user does not have MFA enabled');
  });

  it('strips an unquoted resourceId from the title', () => {
    const f = makeFinding({
      title: 'CloudTrail trail prod-trail is not logging',
      resourceId: 'prod-trail',
    });
    expect(deriveCheckTitle(f)).toBe('CloudTrail trail is not logging');
  });

  it('returns the title unchanged for fixed-id checks (resourceId = account-level)', () => {
    const f = makeFinding({
      title: 'IAM password policy minimum length is below 14 characters',
      resourceId: 'account-level',
    });
    expect(deriveCheckTitle(f)).toBe(
      'IAM password policy minimum length is below 14 characters',
    );
  });

  it('returns the title unchanged when resourceId is not present in title', () => {
    const f = makeFinding({
      title: 'S3 bucket has public access enabled',
      resourceId: 'logs-archive',
    });
    expect(deriveCheckTitle(f)).toBe('S3 bucket has public access enabled');
  });

  it('falls back to checkKey or default when title is missing', () => {
    expect(deriveCheckTitle(makeFinding({ title: null, checkKey: 'iam-no-mfa' }))).toBe(
      'iam-no-mfa',
    );
    expect(deriveCheckTitle(makeFinding({ title: null, checkKey: null }))).toBe(
      'Untitled check',
    );
  });
});

describe('buildCheckGroups', () => {
  it('returns an empty array for empty input', () => {
    expect(buildCheckGroups([])).toEqual([]);
  });

  it('groups findings by checkKey', () => {
    const findings = [
      makeFinding({
        id: 'a',
        checkKey: 'iam-no-mfa',
        title: 'IAM user "john" does not have MFA',
        resourceId: 'john',
        status: 'failed',
        severity: 'high',
      }),
      makeFinding({
        id: 'b',
        checkKey: 'iam-no-mfa',
        title: 'IAM user "alice" does not have MFA',
        resourceId: 'alice',
        status: 'failed',
        severity: 'high',
      }),
      makeFinding({
        id: 'c',
        checkKey: 'iam-no-mfa',
        title: 'IAM user "bob" has MFA',
        resourceId: 'bob',
        status: 'passed',
        severity: 'info',
      }),
    ];
    const groups = buildCheckGroups(findings);
    expect(groups).toHaveLength(1);
    expect(groups[0].checkKey).toBe('iam-no-mfa');
    expect(groups[0].failed).toHaveLength(2);
    expect(groups[0].passed).toHaveLength(1);
    expect(groups[0].all).toHaveLength(3);
  });

  it('produces one group per check kind', () => {
    const findings = [
      makeFinding({
        id: 'a',
        checkKey: 'iam-no-mfa',
        status: 'failed',
      }),
      makeFinding({
        id: 'b',
        checkKey: 'iam-weak-password-length',
        status: 'failed',
      }),
    ];
    expect(buildCheckGroups(findings)).toHaveLength(2);
  });

  it('orders groups by highest severity first (failures lead)', () => {
    const findings = [
      makeFinding({
        id: 'a',
        checkKey: 'check-medium',
        status: 'failed',
        severity: 'medium',
      }),
      makeFinding({
        id: 'b',
        checkKey: 'check-critical',
        status: 'failed',
        severity: 'critical',
      }),
      makeFinding({
        id: 'c',
        checkKey: 'check-allpass',
        status: 'passed',
        severity: 'info',
      }),
    ];
    const groups = buildCheckGroups(findings);
    expect(groups.map((g) => g.checkKey)).toEqual([
      'check-critical',
      'check-medium',
      'check-allpass',
    ]);
  });

  it('falls back to title-as-key when checkKey is missing (legacy findings)', () => {
    const findings = [
      makeFinding({ id: 'a', checkKey: null, title: 'Legacy finding' }),
      makeFinding({ id: 'b', checkKey: null, title: 'Legacy finding' }),
      makeFinding({ id: 'c', checkKey: null, title: 'Different legacy' }),
    ];
    const groups = buildCheckGroups(findings);
    expect(groups).toHaveLength(2);
  });

  it('marks all-passing groups with severity info', () => {
    const findings = [
      makeFinding({
        id: 'a',
        checkKey: 'check-all-pass',
        status: 'passed',
        severity: 'info',
      }),
    ];
    const groups = buildCheckGroups(findings);
    expect(groups[0].severity).toBe('info');
    expect(groups[0].failed).toHaveLength(0);
    expect(groups[0].passed).toHaveLength(1);
  });
});
