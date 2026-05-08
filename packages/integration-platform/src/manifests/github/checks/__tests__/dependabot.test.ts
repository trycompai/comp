import { describe, expect, it } from 'bun:test';
import type { CheckContext, CheckResult, CheckVariableValues } from '../../../../types';
import type { GitHubDependabotAlert, GitHubRepo } from '../../types';
import { dependabotCheck } from '../dependabot';
import {
  countAtOrAboveSeverity,
  highestPresentSeverity,
  resolveSeverityThreshold,
  thresholdLabel,
} from '../dependabot-alert-severity';

type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

interface RepoFixture {
  full_name: string;
  name: string;
  html_url: string;
  dependabotStatus: 'enabled' | 'paused' | 'disabled' | 'unknown';
  openAlertSeverities: AlertSeverity[];
  fixedCount?: number;
  dismissedCount?: number;
  alertsFetchFails?: boolean;
}

interface RunResult {
  passed: Array<{ resourceId: string; title: string; description: string }>;
  failed: Array<{
    resourceId: string;
    title: string;
    description: string;
    severity: CheckResult['severity'];
  }>;
}

const makeRepo = (fixture: RepoFixture): GitHubRepo =>
  ({
    id: 1,
    name: fixture.name,
    full_name: fixture.full_name,
    private: false,
    html_url: fixture.html_url,
    default_branch: 'main',
    owner: { login: fixture.full_name.split('/')[0]!, type: 'Organization' },
  }) as GitHubRepo;

const makeAlert = (severity: AlertSeverity): GitHubDependabotAlert =>
  ({
    number: Math.floor(Math.random() * 10000),
    state: 'open',
    security_vulnerability: { severity },
  }) as unknown as GitHubDependabotAlert;

async function runCheck(
  fixtures: RepoFixture[],
  variables: CheckVariableValues,
): Promise<RunResult> {
  const passed: RunResult['passed'] = [];
  const failed: RunResult['failed'] = [];

  const byFullName = new Map(fixtures.map((f) => [f.full_name, f]));

  const ctx: CheckContext = {
    accessToken: 'tok',
    credentials: {},
    variables,
    connectionId: 'conn_1',
    organizationId: 'org_1',
    metadata: {},
    log: () => {},
    warn: () => {},
    pass: (result) => {
      passed.push({
        resourceId: result.resourceId ?? '',
        title: result.title,
        description: result.description,
      });
    },
    fail: (result) => {
      failed.push({
        resourceId: result.resourceId ?? '',
        title: result.title,
        description: result.description,
        severity: result.severity,
      });
    },
    fetch: (async <T,>(path: string): Promise<T> => {
      // /repos/<owner>/<repo>
      const repoMatch = path.match(/^\/repos\/([^/]+\/[^/]+)$/);
      if (repoMatch) {
        const fixture = byFullName.get(repoMatch[1]!);
        if (!fixture) throw new Error(`404 ${path}`);
        return makeRepo(fixture) as unknown as T;
      }
      // /repos/<owner>/<repo>/automated-security-fixes
      const statusMatch = path.match(/^\/repos\/([^/]+\/[^/]+)\/automated-security-fixes$/);
      if (statusMatch) {
        const fixture = byFullName.get(statusMatch[1]!);
        if (!fixture) throw new Error(`404 ${path}`);
        if (fixture.dependabotStatus === 'unknown') throw new Error('403 Forbidden');
        if (fixture.dependabotStatus === 'disabled') throw new Error('404 Not Found');
        return {
          enabled: true,
          paused: fixture.dependabotStatus === 'paused',
        } as unknown as T;
      }
      throw new Error(`Unexpected fetch: ${path}`);
    }) as CheckContext['fetch'],
    fetchAllPages: (async () => []) as CheckContext['fetchAllPages'],
    fetchWithLinkHeader: (async <T,>(
      path: string,
      options?: { params?: Record<string, string> },
    ): Promise<T[]> => {
      const alertsMatch = path.match(/^\/repos\/([^/]+\/[^/]+)\/dependabot\/alerts$/);
      if (!alertsMatch) throw new Error(`Unexpected fetchWithLinkHeader: ${path}`);
      const fixture = byFullName.get(alertsMatch[1]!);
      if (!fixture) throw new Error(`404 ${path}`);
      if (fixture.alertsFetchFails) throw new Error('403 Forbidden');
      const state = options?.params?.state;
      if (state === 'open') {
        return fixture.openAlertSeverities.map(makeAlert) as unknown as T[];
      }
      if (state === 'fixed') {
        return (Array(fixture.fixedCount ?? 0).fill(makeAlert('low')) as unknown) as T[];
      }
      if (state === 'dismissed') {
        return (Array(fixture.dismissedCount ?? 0).fill(makeAlert('low')) as unknown) as T[];
      }
      return [] as unknown as T[];
    }) as CheckContext['fetchWithLinkHeader'],
    fetchWithCursor: (async () => []) as CheckContext['fetchWithCursor'],
    graphql: (async () => ({})) as CheckContext['graphql'],
    getState: (async () => null) as CheckContext['getState'],
    setState: (async () => {}) as CheckContext['setState'],
  } as CheckContext;

  await dependabotCheck.run(ctx);
  return { passed, failed };
}

const repo = (fullName: string, overrides: Partial<RepoFixture> = {}): RepoFixture => ({
  full_name: fullName,
  name: fullName.split('/')[1]!,
  html_url: `https://github.com/${fullName}`,
  dependabotStatus: 'enabled',
  openAlertSeverities: [],
  ...overrides,
});

describe('dependabotCheck severity gating', () => {
  it('passes when Dependabot is enabled and there are zero open alerts', async () => {
    const result = await runCheck([repo('acme/api')], {
      target_repos: ['acme/api'],
    });
    expect(result.passed.map((p) => p.title)).toEqual(['Dependabot enabled on api']);
    expect(result.failed).toEqual([]);
  });

  it('fails when Dependabot is enabled but open high alerts exist (default threshold)', async () => {
    // This is the exact bug reported: 8 high alerts should fail, not pass.
    const result = await runCheck(
      [
        repo('acme/api', {
          openAlertSeverities: Array<AlertSeverity>(8).fill('high'),
        }),
      ],
      { target_repos: ['acme/api'] },
    );
    expect(result.passed).toEqual([]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.title).toBe('8 unresolved Dependabot alerts on api');
    expect(result.failed[0]!.severity).toBe('high');
    expect(result.failed[0]!.description).toContain('8 open high severity or above alerts');
  });

  it('fails with critical severity when critical alerts are present', async () => {
    const result = await runCheck(
      [
        repo('acme/api', {
          openAlertSeverities: ['critical', 'critical', 'high'],
        }),
      ],
      { target_repos: ['acme/api'] },
    );
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.severity).toBe('critical');
    expect(result.failed[0]!.title).toBe('3 unresolved Dependabot alerts on api');
  });

  it('passes when only medium alerts exist and default threshold is high', async () => {
    const result = await runCheck(
      [
        repo('acme/api', {
          openAlertSeverities: ['medium', 'medium', 'low'],
        }),
      ],
      { target_repos: ['acme/api'] },
    );
    expect(result.passed).toHaveLength(1);
    expect(result.failed).toEqual([]);
  });

  it('passes when threshold is critical and only high alerts exist', async () => {
    const result = await runCheck(
      [repo('acme/api', { openAlertSeverities: ['high', 'high'] })],
      { target_repos: ['acme/api'], alert_severity_threshold: 'critical' },
    );
    expect(result.passed).toHaveLength(1);
    expect(result.failed).toEqual([]);
  });

  it('fails when threshold is low and any alert exists', async () => {
    const result = await runCheck(
      [repo('acme/api', { openAlertSeverities: ['low'] })],
      { target_repos: ['acme/api'], alert_severity_threshold: 'low' },
    );
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.title).toBe('1 unresolved Dependabot alert on api');
    expect(result.failed[0]!.description).toContain('1 open any severity alert is still unresolved');
  });

  it('fails when Dependabot is paused but high alerts exist', async () => {
    const result = await runCheck(
      [
        repo('acme/api', {
          dependabotStatus: 'paused',
          openAlertSeverities: ['high', 'high'],
        }),
      ],
      { target_repos: ['acme/api'] },
    );
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.title).toBe('2 unresolved Dependabot alerts on api (paused)');
    expect(result.failed[0]!.description).toContain('Paused Dependabot');
  });

  it('passes (paused) when no threshold alerts exist', async () => {
    const result = await runCheck(
      [repo('acme/api', { dependabotStatus: 'paused', openAlertSeverities: [] })],
      { target_repos: ['acme/api'] },
    );
    expect(result.passed).toHaveLength(1);
    expect(result.passed[0]!.title).toBe('Dependabot enabled on api (paused)');
  });

  it('fails with generic "not enabled" message when Dependabot is disabled, ignoring threshold', async () => {
    const result = await runCheck(
      [
        repo('acme/api', {
          dependabotStatus: 'disabled',
          openAlertSeverities: ['critical'],
        }),
      ],
      { target_repos: ['acme/api'] },
    );
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.title).toBe('Dependabot not enabled on api');
  });

  it('passes when alert fetch fails (null alertCounts) and Dependabot is enabled', async () => {
    // No alert signal -> do not regress to a false-fail.
    const result = await runCheck(
      [repo('acme/api', { alertsFetchFails: true })],
      { target_repos: ['acme/api'] },
    );
    expect(result.passed).toHaveLength(1);
    expect(result.failed).toEqual([]);
  });

  it('handles unknown threshold by falling back to "high"', async () => {
    const result = await runCheck(
      [repo('acme/api', { openAlertSeverities: ['high'] })],
      { target_repos: ['acme/api'], alert_severity_threshold: 'bogus' },
    );
    expect(result.failed).toHaveLength(1);
  });
});

describe('dependabot severity helpers', () => {
  it('countAtOrAboveSeverity sums the right buckets per threshold', () => {
    const counts = { critical: 2, high: 3, medium: 5, low: 7 };
    expect(countAtOrAboveSeverity(counts, 'critical')).toBe(2);
    expect(countAtOrAboveSeverity(counts, 'high')).toBe(5);
    expect(countAtOrAboveSeverity(counts, 'medium')).toBe(10);
    expect(countAtOrAboveSeverity(counts, 'low')).toBe(17);
  });

  it('highestPresentSeverity returns the highest bucket with a non-zero count', () => {
    expect(highestPresentSeverity({ critical: 1, high: 5, medium: 0, low: 0 })).toBe('critical');
    expect(highestPresentSeverity({ critical: 0, high: 5, medium: 0, low: 0 })).toBe('high');
    expect(highestPresentSeverity({ critical: 0, high: 0, medium: 2, low: 1 })).toBe('medium');
    expect(highestPresentSeverity({ critical: 0, high: 0, medium: 0, low: 0 })).toBe('low');
  });

  it('resolveSeverityThreshold normalizes invalid input to "high"', () => {
    expect(resolveSeverityThreshold(undefined)).toBe('high');
    expect(resolveSeverityThreshold('')).toBe('high');
    expect(resolveSeverityThreshold('BOGUS')).toBe('high');
    expect(resolveSeverityThreshold('critical')).toBe('critical');
    expect(resolveSeverityThreshold('low')).toBe('low');
  });

  it('thresholdLabel humanizes each level', () => {
    expect(thresholdLabel('critical')).toBe('critical severity or above');
    expect(thresholdLabel('high')).toBe('high severity or above');
    expect(thresholdLabel('medium')).toBe('medium severity or above');
    expect(thresholdLabel('low')).toBe('any severity');
  });
});
