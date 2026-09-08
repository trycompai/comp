import { describe, expect, it } from 'bun:test';
import type { CheckContext, CheckResult, CheckVariableValues } from '../../../../types';
import type { CybeDefendFinding } from '../../types';
import { createProjectFindingsCheck } from '../project-findings-check';

const PAT = 'pat_secret_value_that_must_never_escape';

interface Emitted {
  passed: Array<{ resourceId: string; resourceType: string; title: string; evidence: unknown }>;
  failed: Array<{
    resourceId: string;
    resourceType: string;
    title: string;
    severity: CheckResult['severity'];
    remediation?: string;
    evidence?: unknown;
  }>;
}

const finding = ({
  id,
  projectId,
  projectName = 'proj',
  findingType = 'sast',
  severity = 'high',
}: {
  id: string;
  projectId: string;
  projectName?: string;
  findingType?: string;
  severity?: string;
}): CybeDefendFinding =>
  ({
    id,
    title: 'Rule',
    description: '',
    remediation: '',
    severity,
    status: 'confirmed',
    finding_type: findingType,
    project_id: projectId,
    project_name: projectName,
    first_detected_at: null,
    last_detected_at: null,
    triaged_at: null,
    resolved_at: null,
    triaged_by: null,
    triaged_by_type: null,
    dismissal_reason: null,
    updated_at: '2026-08-06T08:26:17.000Z',
    url: 'https://eu.cybedefend.com/x',
    details: { path: 'src/a.py', line: 1 },
  }) satisfies CybeDefendFinding;

const run = async ({
  findings,
  projects,
  variables = {},
  collectLogs,
}: {
  findings: CybeDefendFinding[];
  projects: Array<{ projectId: string; projectName: string }>;
  variables?: CheckVariableValues;
  collectLogs?: string[];
}): Promise<Emitted> => {
  const emitted: Emitted = { passed: [], failed: [] };

  const ctx = {
    accessToken: '',
    credentials: {
      region: 'eu',
      organizationId: '00000000-0000-4000-8000-000000000000',
      personalAccessToken: PAT,
    },
    variables,
    connectionId: 'conn_1',
    organizationId: 'org_1',
    metadata: {},
    log: (m: string) => collectLogs?.push(m),
    warn: (m: string) => collectLogs?.push(m),
    error: (m: string) => collectLogs?.push(m),
    pass: (r: Parameters<CheckContext['pass']>[0]) => {
      emitted.passed.push({
        resourceId: r.resourceId,
        resourceType: r.resourceType,
        title: r.title,
        evidence: r.evidence,
      });
    },
    fail: (f: Parameters<CheckContext['fail']>[0]) => {
      emitted.failed.push({
        resourceId: f.resourceId,
        resourceType: f.resourceType,
        title: f.title,
        severity: f.severity,
        remediation: f.remediation,
        evidence: f.evidence,
      });
    },
    addPassingResult: () => {},
    addFinding: () => {},
  } as unknown as CheckContext;

  const check = createProjectFindingsCheck({
    id: 'cybedefend_sast',
    name: 'SAST',
    description: 'desc',
    service: 'code-scanning',
    findingType: 'sast',
    fetchImpl: async (url: string) => {
      if (url.includes('/client-apps')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ cli: { appId: 'app' } }),
          text: async () => '',
        };
      }
      if (url.includes('/oidc/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'issued' }),
          text: async () => '',
        };
      }
      if (url.includes('/user/profile')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            myAccessibleProjects: projects.map((p) => ({
              ...p,
              organizationId: '00000000-0000-4000-8000-000000000000',
            })),
          }),
          text: async () => '',
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { findings, next_cursor: null, has_more: false, next_since: null },
        }),
        text: async () => '',
      };
    },
  });

  await check.run(ctx);
  return emitted;
};

describe('createProjectFindingsCheck: one result per project', () => {
  it('emits a single result per project, not one per finding', async () => {
    const emitted = await run({
      findings: [
        finding({ id: 'a', projectId: 'p1' }),
        finding({ id: 'b', projectId: 'p1' }),
        finding({ id: 'c', projectId: 'p1' }),
      ],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
    });

    expect(emitted.passed.length + emitted.failed.length).toBe(1);
  });

  it('keys the result on the project, as a project resource', async () => {
    const emitted = await run({
      findings: [finding({ id: 'a', projectId: 'p1' })],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
    });

    expect(emitted.failed[0]?.resourceId).toBe('p1');
    expect(emitted.failed[0]?.resourceType).toBe('project');
  });

  it('passes a project that has no findings of this type', async () => {
    // A clean project never appears in the findings feed, so it has to come
    // from the project list, otherwise clean repositories are invisible.
    const emitted = await run({
      findings: [],
      projects: [{ projectId: 'p1', projectName: 'clean' }],
    });

    expect(emitted.passed.map((p) => p.resourceId)).toEqual(['p1']);
    expect(emitted.failed).toHaveLength(0);
  });

  it('ignores findings belonging to another scan type', async () => {
    const emitted = await run({
      findings: [finding({ id: 'a', projectId: 'p1', findingType: 'sca' })],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
    });

    expect(emitted.passed).toHaveLength(1);
    expect(emitted.failed).toHaveLength(0);
  });
});

describe('createProjectFindingsCheck: severity threshold', () => {
  it('fails a project whose findings reach the threshold', async () => {
    const emitted = await run({
      findings: [finding({ id: 'a', projectId: 'p1', severity: 'critical' })],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
      variables: { severity_threshold: 'high' },
    });

    expect(emitted.failed).toHaveLength(1);
  });

  it('passes a project whose findings all sit below the threshold', async () => {
    const emitted = await run({
      findings: [finding({ id: 'a', projectId: 'p1', severity: 'low' })],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
      variables: { severity_threshold: 'high' },
    });

    expect(emitted.passed).toHaveLength(1);
    expect(emitted.failed).toHaveLength(0);
  });

  it('reports the per-severity counts as evidence', async () => {
    const emitted = await run({
      findings: [
        finding({ id: 'a', projectId: 'p1', severity: 'low' }),
        finding({ id: 'b', projectId: 'p1', severity: 'low' }),
      ],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
      variables: { severity_threshold: 'critical' },
    });

    expect(emitted.passed[0]?.evidence).toMatchObject({
      counts: { critical: 0, high: 0, medium: 0, low: 2, unknown: 0 },
      total: 2,
    });
  });
});

describe('createProjectFindingsCheck: unrecognised severity', () => {
  // CybeDefend severities are critical/high/medium/low. Anything else is a
  // provider-side anomaly: it must stay visible rather than be folded into the
  // weakest level, which is how 19 real findings once went unreported.
  it('counts a finding whose severity it cannot read', async () => {
    const emitted = await run({
      findings: [finding({ id: 'a', projectId: 'p1', severity: '' })],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
    });

    expect(emitted.passed[0]?.evidence).toMatchObject({ counts: { unknown: 1 }, total: 1 });
  });

  it('does not let an unreadable severity breach the threshold', async () => {
    const emitted = await run({
      findings: [finding({ id: 'a', projectId: 'p1', severity: 'catastrophic' })],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
    });

    expect(emitted.failed).toHaveLength(0);
  });

  it('survives a severity the export did not send as a string', async () => {
    const emitted = await run({
      findings: [
        finding({ id: 'a', projectId: 'p1', severity: null as unknown as string }),
        finding({ id: 'b', projectId: 'p1', severity: 'critical' }),
      ],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
    });

    expect(emitted.failed).toHaveLength(1);
    expect(emitted.failed[0]?.evidence).toMatchObject({ counts: { unknown: 1, critical: 1 } });
  });

  it('does not let an unreadable severity breach even the lowest threshold', async () => {
    // The edge case behind the claim: `low` is rank 0 and unknown is -1, so the
    // comparison has to stay strict. A fallback to rank 0 would breach here.
    const emitted = await run({
      findings: [finding({ id: 'a', projectId: 'p1', severity: '' })],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
      variables: { severity_threshold: 'low' },
    });

    expect(emitted.failed).toHaveLength(0);
    expect(emitted.passed[0]?.evidence).toMatchObject({ counts: { unknown: 1 } });
  });

  it('warns so the anomaly is visible without a database query', async () => {
    const lines: string[] = [];
    await run({
      findings: [finding({ id: 'a', projectId: 'p1', severity: 'catastrophic' })],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
      collectLogs: lines,
    });

    expect(lines.join('\n')).toMatch(/1 finding\(s\) with an unrecognised severity/i);
  });

  it('stays silent when every severity is readable', async () => {
    const lines: string[] = [];
    await run({
      findings: [finding({ id: 'a', projectId: 'p1', severity: 'high' })],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
      collectLogs: lines,
    });

    expect(lines.join('\n')).not.toMatch(/unrecognised severity/i);
  });
});

describe('createProjectFindingsCheck: threshold variable', () => {
  const threshold = () => {
    const check = createProjectFindingsCheck({
      id: 'cybedefend_sast',
      name: 'SAST',
      description: 'desc',
      service: 'code-scanning',
      findingType: 'sast',
    });
    return (check.variables ?? []).find((v) => v.id === 'severity_threshold');
  };

  it('declares the default the code actually applies', async () => {
    // Without this the connection form shows an empty selector, and the
    // operator cannot tell which threshold will be used.
    expect(threshold()?.default).toBe('high');
  });

  it('marks the default option in its label', async () => {
    const option = threshold()?.options?.find((o) => o.value === 'high');

    expect(option?.label).toContain('default');
  });

  it('applies that same default when the variable is unset', async () => {
    const emitted = await run({
      findings: [finding({ id: 'a', projectId: 'p1', severity: 'high' })],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
      variables: {},
    });

    expect(emitted.failed).toHaveLength(1);
  });
});

describe('createProjectFindingsCheck: remediation wording', () => {
  const failing = async () =>
    (
      await run({
        findings: [
          finding({ id: 'a', projectId: 'p1', projectName: 'vulpy', severity: 'critical' }),
        ],
        projects: [{ projectId: 'p1', projectName: 'vulpy' }],
      })
    ).failed[0];

  it('names the project rather than pasting a raw URL', async () => {
    const result = await failing();

    expect(result?.remediation).toContain('vulpy');
    expect(result?.remediation).not.toContain('http');
  });

  it('still carries the deep link in the evidence', async () => {
    // Dropping the URL from the prose must not lose the way back to the finding.
    const result = await failing();

    expect(result?.evidence).toMatchObject({
      projectUrl: 'https://eu.cybedefend.com/project/p1',
      projectName: 'vulpy',
    });
  });
});

describe('createProjectFindingsCheck: diagnostics', () => {
  const logsOf = async (args: Parameters<typeof run>[0]): Promise<string[]> => {
    const lines: string[] = [];
    await run({ ...args, collectLogs: lines });
    return lines;
  };

  it('reports which region and organization it is querying', async () => {
    const lines = await logsOf({
      findings: [],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
    });

    expect(lines.join('\n')).toContain('region eu');
  });

  it('reports how many projects and findings it saw', async () => {
    const lines = await logsOf({
      findings: [finding({ id: 'a', projectId: 'p1' }), finding({ id: 'b', projectId: 'p1' })],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
    });

    const joined = lines.join('\n');
    expect(joined).toContain('1 project');
    expect(joined).toContain('2 open finding');
  });

  it('reports the pass and fail tally it emitted', async () => {
    const lines = await logsOf({
      findings: [finding({ id: 'a', projectId: 'p1', severity: 'critical' })],
      projects: [
        { projectId: 'p1', projectName: 'vulpy' },
        { projectId: 'p2', projectName: 'clean' },
      ],
    });

    expect(lines.join('\n')).toContain('1 failed, 1 passed');
  });

  it('never writes the personal access token to the logs', async () => {
    const lines = await logsOf({
      findings: [finding({ id: 'a', projectId: 'p1' })],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
    });

    expect(lines.join('\n')).not.toContain(PAT);
  });
});

describe('createProjectFindingsCheck: secrets', () => {
  it('never puts the personal access token in an emitted result', async () => {
    const emitted = await run({
      findings: [finding({ id: 'a', projectId: 'p1' })],
      projects: [{ projectId: 'p1', projectName: 'vulpy' }],
    });

    expect(JSON.stringify(emitted)).not.toContain(PAT);
  });
});
