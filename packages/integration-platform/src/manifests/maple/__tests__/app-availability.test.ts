import { describe, expect, it } from 'bun:test';
import type { CheckVariableValues } from '../../../types';
import { appAvailabilityCheck } from '../checks/app-availability';
import { fakeContext } from './fake-context';
import { makeDestination, makeRule, makeService } from './fixtures';

const run = async (
  routes: Parameters<typeof fakeContext>[0]['routes'],
  variables?: CheckVariableValues,
) => {
  const fake = fakeContext({
    routes: { '/v2/alerts/destinations': [makeDestination()], ...routes },
    variables,
  });
  await appAvailabilityCheck.run(fake.ctx);
  return fake;
};

describe('appAvailabilityCheck', () => {
  it('passes once with a routed availability rule', async () => {
    const { passed, failed } = await run({
      '/v2/services': [makeService(), makeService({ name: 'payments' })],
      '/v2/alerts/rules': [makeRule({ service_names: ['payments'] })],
    });
    expect(failed).toEqual([]);
    expect(passed).toEqual(['availability-alerts']);
  });

  it('fails when no services report telemetry', async () => {
    const { failed } = await run({ '/v2/services': [], '/v2/alerts/rules': [] });
    expect(failed).toEqual(['services']);
  });

  it('fails when no rule is an enabled, routed availability rule', async () => {
    const { failed, passed } = await run({
      '/v2/services': [makeService()],
      '/v2/alerts/rules': [
        makeRule({ id: 'a', enabled: false }),
        makeRule({ id: 'b', signal_type: 'raw_query' }),
        makeRule({ id: 'c', destination_ids: [] }),
      ],
    });
    expect(failed).toEqual(['availability-alerts']);
    expect(passed).toEqual([]);
  });

  it('records per-service coverage as evidence', async () => {
    const fake = fakeContext({
      routes: {
        '/v2/alerts/destinations': [makeDestination()],
        '/v2/services': [makeService(), makeService({ name: 'payments' })],
        '/v2/alerts/rules': [makeRule({ exclude_service_names: ['checkout'] })],
      },
    });
    let evidence: Record<string, unknown> | undefined;
    fake.ctx.pass = (result) => {
      evidence = result.evidence;
    };
    await appAvailabilityCheck.run(fake.ctx);
    expect(evidence?.uncoveredServices).toEqual(['checkout']);
  });

  it('passes the environment and window to the services query', async () => {
    const { calls } = await run(
      { '/v2/services': [makeService()], '/v2/alerts/rules': [makeRule()] },
      { environment: ' production ', lookback_hours: 6 },
    );
    const params = calls.find((c) => c.path === '/v2/services')?.params ?? {};
    expect(params.deployment_environment).toBe('production');
    const windowMs = Date.parse(params.end_time ?? '') - Date.parse(params.start_time ?? '');
    expect(windowMs).toBe(6 * 3_600_000);
  });
});
