import { MacedClient, type MacedPentestRun } from '../src/security-penetration-tests/maced-client';

const enabledValues = new Set(['1', 'true', 'yes']);
const isContractCanaryEnabled = enabledValues.has(
  (process.env.MACED_CONTRACT_E2E ?? '').toLowerCase(),
);

const describeIfEnabled = isContractCanaryEnabled ? describe : describe.skip;

const validStatuses = new Set([
  'provisioning',
  'cloning',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

describeIfEnabled('Maced provider contract canary (e2e)', () => {
  let client: MacedClient;

  beforeAll(() => {
    if (!process.env.MACED_API_KEY) {
      throw new Error(
        'MACED_API_KEY is required when MACED_CONTRACT_E2E is enabled',
      );
    }

    client = new MacedClient();
  });

  const assertRunShape = (run: MacedPentestRun) => {
    expect(typeof run.id).toBe('string');
    expect(run.id.length).toBeGreaterThan(0);
    expect(typeof run.targetUrl).toBe('string');
    expect(() => new URL(run.targetUrl)).not.toThrow();
    expect(validStatuses.has(run.status)).toBe(true);
    expect(Number.isNaN(Date.parse(run.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(run.updatedAt))).toBe(false);

    if (run.repoUrl) {
      expect(() => new URL(run.repoUrl)).not.toThrow();
    }

    if (run.temporalUiUrl) {
      expect(() => new URL(run.temporalUiUrl)).not.toThrow();
    }

    if (run.webhookUrl) {
      expect(() => new URL(run.webhookUrl)).not.toThrow();
    }
  };

  it('lists runs and validates canonical response shape', async () => {
    const runs = await client.listPentests();

    expect(Array.isArray(runs)).toBe(true);
    for (const run of runs) {
      assertRunShape(run);
    }
  });

  const runIdForDeepChecks = process.env.MACED_CONTRACT_E2E_RUN_ID;
  const itIfRunIdProvided = runIdForDeepChecks ? it : it.skip;

  itIfRunIdProvided(
    'fetches canonical run detail and progress for provided run id',
    async () => {
      const runId = runIdForDeepChecks as string;

      const run = await client.getPentest(runId);
      assertRunShape(run);
      expect(run.id).toBe(runId);
      expect(typeof run.progress.status).toBe('string');
      expect(validStatuses.has(run.progress.status)).toBe(true);
      expect(run.progress.completedAgents).toBeGreaterThanOrEqual(0);
      expect(run.progress.totalAgents).toBeGreaterThanOrEqual(0);
      expect(run.progress.elapsedMs).toBeGreaterThanOrEqual(0);

      const progress = await client.getPentestProgress(runId);
      expect(validStatuses.has(progress.status)).toBe(true);
      expect(progress.completedAgents).toBeGreaterThanOrEqual(0);
      expect(progress.totalAgents).toBeGreaterThanOrEqual(0);
      expect(progress.elapsedMs).toBeGreaterThanOrEqual(0);
    },
  );
});
