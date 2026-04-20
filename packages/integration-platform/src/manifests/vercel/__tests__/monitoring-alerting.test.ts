import { describe, expect, it } from 'bun:test';
import { monitoringAlertingCheck } from '../checks/monitoring-alerting';
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

const makeDeployment = (state: VercelDeployment['state']): VercelDeployment => ({
  uid: 'dpl_' + state,
  name: state,
  url: `${state}.vercel.app`,
  state,
  type: 'LAMBDAS',
  created: Date.now(),
  createdAt: Date.now(),
  creator: { uid: 'u' },
});

async function runWithVariables(
  projects: VercelProject[],
  variables: CheckVariableValues | undefined,
): Promise<{
  checkedProjectIds: string[];
  passedResourceIds: string[];
  failedResourceIds: string[];
}> {
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
      if (path.startsWith('/v9/projects')) {
        return { projects } satisfies VercelProjectsResponse as unknown as T;
      }
      if (path.startsWith('/v6/deployments')) {
        const url = new URL(path, 'https://api.vercel.com');
        const projectId = url.searchParams.get('projectId') ?? '';
        checkedProjectIds.push(projectId);
        return {
          deployments: [makeDeployment('READY')],
        } satisfies VercelDeploymentsResponse as unknown as T;
      }
      throw new Error(`Unexpected fetch: ${path}`);
    }) as CheckContext['fetch'],
    fetchAllPages: (async () => []) as CheckContext['fetchAllPages'],
    graphql: (async () => ({})) as CheckContext['graphql'],
  } as CheckContext;

  await monitoringAlertingCheck.run(ctx);
  return { checkedProjectIds, passedResourceIds: passed, failedResourceIds: failed };
}

describe('monitoringAlertingCheck filter behaviour', () => {
  const projects = [
    makeProject('prj_a', 'a'),
    makeProject('prj_b', 'b'),
    makeProject('prj_c', 'c'),
  ];

  it('defaults to all projects', async () => {
    const result = await runWithVariables(projects, undefined);
    expect(result.checkedProjectIds.sort()).toEqual(['prj_a', 'prj_b', 'prj_c']);
  });

  it('honours include mode', async () => {
    const result = await runWithVariables(projects, {
      project_filter_mode: 'include',
      filtered_projects: ['prj_b'],
    });
    expect(result.checkedProjectIds).toEqual(['prj_b']);
  });

  it('honours exclude mode', async () => {
    const result = await runWithVariables(projects, {
      project_filter_mode: 'exclude',
      filtered_projects: ['prj_a'],
    });
    expect(result.checkedProjectIds.sort()).toEqual(['prj_b', 'prj_c']);
  });

  it('emits a filter-applied evidence pass', async () => {
    const result = await runWithVariables(projects, {
      project_filter_mode: 'include',
      filtered_projects: ['prj_b'],
    });
    expect(result.passedResourceIds).toContain('project-filter');
  });

  it('fails when filter resolves to zero scoped projects', async () => {
    const result = await runWithVariables(projects, {
      project_filter_mode: 'exclude',
      filtered_projects: ['prj_a', 'prj_b', 'prj_c'],
    });
    expect(result.failedResourceIds).toContain('project-filter');
    expect(result.checkedProjectIds).toEqual([]);
  });
});
