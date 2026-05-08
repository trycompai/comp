import { describe, expect, it } from 'bun:test';
import { appAvailabilityCheck } from '../checks/app-availability';
import type { CheckContext, CheckVariableValues } from '../../../types';
import type {
  VercelDeployment,
  VercelDeploymentsResponse,
  VercelProject,
  VercelProjectsResponse,
} from '../types';

const makeProject = (id: string, name: string): VercelProject => ({
  id,
  name,
  accountId: 'acc_1',
  createdAt: 0,
  updatedAt: 0,
});

const makeReadyDeployment = (): VercelDeployment => ({
  uid: 'dpl_1',
  name: 'd',
  url: 'd.vercel.app',
  state: 'READY',
  type: 'LAMBDAS',
  created: Date.now(),
  createdAt: Date.now(),
  creator: { uid: 'u' },
});

interface RunResult {
  passedResourceIds: string[];
  failedResourceIds: string[];
  checkedProjectIds: string[];
}

async function runWithVariables(
  projects: VercelProject[],
  variables: CheckVariableValues | undefined,
): Promise<RunResult> {
  const checkedProjectIds: string[] = [];
  const passed: string[] = [];
  const failed: string[] = [];

  const ctx: CheckContext = {
    accessToken: 'tok',
    credentials: {},
    variables,
    connectionId: 'conn_1',
    organizationId: 'org_1',
    metadata: { oauth: { team: { id: 'team_1', name: 'Team' } } },
    log: () => {},
    pass: (result) => {
      passed.push(result.resourceId);
    },
    fail: (result) => {
      failed.push(result.resourceId);
    },
    fetch: (async <T,>(path: string): Promise<T> => {
      if (path === '/v9/projects?teamId=team_1' || path === '/v9/projects') {
        return { projects } satisfies VercelProjectsResponse as unknown as T;
      }
      if (path.startsWith('/v6/deployments')) {
        const url = new URL(path, 'https://api.vercel.com');
        const projectId = url.searchParams.get('projectId') ?? '';
        checkedProjectIds.push(projectId);
        return {
          deployments: [makeReadyDeployment()],
        } satisfies VercelDeploymentsResponse as unknown as T;
      }
      throw new Error(`Unexpected fetch: ${path}`);
    }) as CheckContext['fetch'],
    fetchAllPages: (async () => []) as CheckContext['fetchAllPages'],
    graphql: (async () => ({})) as CheckContext['graphql'],
  } as CheckContext;

  await appAvailabilityCheck.run(ctx);
  return { passedResourceIds: passed, failedResourceIds: failed, checkedProjectIds };
}

describe('appAvailabilityCheck filter behaviour', () => {
  const projects = [
    makeProject('prj_a', 'a'),
    makeProject('prj_b', 'b'),
    makeProject('prj_c', 'c'),
  ];

  it('checks all projects when no filter is configured', async () => {
    const result = await runWithVariables(projects, undefined);
    expect(result.checkedProjectIds.sort()).toEqual(['prj_a', 'prj_b', 'prj_c']);
  });

  it('checks all projects when mode is "all" with a selection', async () => {
    const result = await runWithVariables(projects, {
      project_filter_mode: 'all',
      filtered_projects: ['prj_a'],
    });
    expect(result.checkedProjectIds.sort()).toEqual(['prj_a', 'prj_b', 'prj_c']);
  });

  it('checks only selected projects in include mode', async () => {
    const result = await runWithVariables(projects, {
      project_filter_mode: 'include',
      filtered_projects: ['prj_a', 'prj_c'],
    });
    expect(result.checkedProjectIds.sort()).toEqual(['prj_a', 'prj_c']);
  });

  it('skips selected projects in exclude mode', async () => {
    const result = await runWithVariables(projects, {
      project_filter_mode: 'exclude',
      filtered_projects: ['prj_b'],
    });
    expect(result.checkedProjectIds.sort()).toEqual(['prj_a', 'prj_c']);
  });

  it('falls back to all projects when include mode has no selection', async () => {
    const result = await runWithVariables(projects, {
      project_filter_mode: 'include',
      filtered_projects: [],
    });
    expect(result.checkedProjectIds.sort()).toEqual(['prj_a', 'prj_b', 'prj_c']);
  });

  it('emits a filter-applied evidence pass recording the active mode', async () => {
    const result = await runWithVariables(projects, {
      project_filter_mode: 'exclude',
      filtered_projects: ['prj_b'],
    });
    expect(result.passedResourceIds).toContain('project-filter');
  });

  it('does not emit a filter-applied pass when no projects are returned', async () => {
    const result = await runWithVariables([], {
      project_filter_mode: 'exclude',
      filtered_projects: ['prj_anything'],
    });
    expect(result.passedResourceIds).not.toContain('project-filter');
    expect(result.failedResourceIds).toContain('projects');
  });

  it('fails when filter resolves to zero scoped projects', async () => {
    const result = await runWithVariables(projects, {
      project_filter_mode: 'include',
      filtered_projects: ['prj_does_not_exist'],
    });
    expect(result.failedResourceIds).toContain('project-filter');
    expect(result.checkedProjectIds).toEqual([]);
    expect(result.passedResourceIds).not.toContain('project-filter');
  });
});
