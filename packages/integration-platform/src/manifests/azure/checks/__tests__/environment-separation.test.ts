import { describe, expect, it } from 'bun:test';
import type {
  CheckContext,
  CheckFindingResult,
  CheckPassingResult,
  CheckVariableValues,
} from '../../../../types';
import { environmentSeparationCheck } from '../environment-separation';

interface CapturedResults {
  passed: CheckPassingResult[];
  failed: CheckFindingResult[];
}

async function runEnvironmentSeparation({
  fetch,
  variables = { subscription_id: 'sub-1' },
}: {
  fetch: (url: string) => unknown;
  variables?: CheckVariableValues;
}): Promise<CapturedResults> {
  const passed: CheckPassingResult[] = [];
  const failed: CheckFindingResult[] = [];
  const ctx = {
    accessToken: 'tok',
    credentials: {},
    variables,
    connectionId: 'connection-id',
    organizationId: 'organization-id',
    metadata: {},
    log: () => {},
    warn: () => {},
    error: () => {},
    pass: (result) => passed.push(result),
    fail: (finding) => failed.push(finding),
    addPassingResult: () => {},
    addFinding: () => {},
    fetch: async (url: string) => fetch(url),
    post: async () => ({}),
    put: async () => ({}),
    patch: async () => ({}),
    delete: async () => ({}),
    graphql: async () => ({}),
    fetchAllPages: async () => [],
    fetchWithCursor: async () => [],
    fetchWithLinkHeader: async () => [],
    getState: async () => null,
    setState: async () => {},
  } as CheckContext;

  await environmentSeparationCheck.run(ctx);
  return { passed, failed };
}

describe('Azure environment separation pagination coverage', () => {
  it('does not emit a resource-group pass when ARM pagination hits the page cap', async () => {
    const out = await runEnvironmentSeparation({
      fetch: (url) => {
        if (url.match(/\/subscriptions\/sub-1\?api-version/)) {
          return { displayName: 'Company' };
        }

        if (url.includes('/resourcegroups')) {
          const pageMatch = url.match(/[?&]page=(\d+)/);
          const page = pageMatch ? Number(pageMatch[1]) : 0;
          const name = page === 0 ? 'rg-prod' : 'rg-dev';

          return {
            value: [{ id: `rg-${page}`, name }],
            nextLink: `https://management.azure.com/subscriptions/sub-1/resourcegroups?page=${
              page + 1
            }`,
          };
        }

        return {};
      },
    });

    expect(out.passed).toHaveLength(0);
    expect(out.failed).toHaveLength(1);
    expect(out.failed[0]!.title).toMatch(/Could not verify environment separation/);
    expect(out.failed[0]!.evidence).toMatchObject({
      coverageIncomplete: true,
      resourceGroupCoverageGaps: ['page-cap'],
      resourceGroupCoverageGapSubscriptions: ['sub-1'],
    });
  });
});
