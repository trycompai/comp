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
  it('passes a service covered by an all-services rule', async () => {
    const { passed, failed } = await run({
      '/v2/services': [makeService()],
      '/v2/alerts/rules': [makeRule()],
    });
    expect(failed).toEqual([]);
    expect(passed).toEqual(['checkout']);
  });

  it('fails when no services report telemetry', async () => {
    const { failed } = await run({ '/v2/services': [], '/v2/alerts/rules': [] });
    expect(failed).toEqual(['services']);
  });

  it('fails a service only covered by a rule scoped to another service', async () => {
    const { failed } = await run({
      '/v2/services': [makeService()],
      '/v2/alerts/rules': [makeRule({ service_names: ['payments'] })],
    });
    expect(failed).toEqual(['checkout']);
  });

  it('fails a service excluded from the rule', async () => {
    const { failed } = await run({
      '/v2/services': [makeService()],
      '/v2/alerts/rules': [makeRule({ exclude_service_names: ['checkout'] })],
    });
    expect(failed).toEqual(['checkout']);
  });

  it('ignores rules on another environment, disabled rules, and query rules', async () => {
    const { failed } = await run({
      '/v2/services': [makeService()],
      '/v2/alerts/rules': [
        makeRule({ id: 'a', environments: ['staging'] }),
        makeRule({ id: 'b', enabled: false }),
        makeRule({ id: 'c', signal_type: 'raw_query' }),
      ],
    });
    expect(failed).toEqual(['checkout']);
  });

  it('ignores rules without an enabled destination', async () => {
    const { failed } = await run({
      '/v2/services': [makeService()],
      '/v2/alerts/rules': [makeRule({ destination_ids: [] })],
    });
    expect(failed).toEqual(['checkout']);
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
