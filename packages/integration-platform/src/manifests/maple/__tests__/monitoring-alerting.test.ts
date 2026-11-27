import { describe, expect, it } from 'bun:test';
import { MAPLE_EU_API_URL, MAPLE_US_API_URL } from '../api';
import { monitoringAlertingCheck } from '../checks/monitoring-alerting';
import { fakeContext, httpError } from './fake-context';
import { makeDestination, makeRule } from './fixtures';

const run = async (
  routes: Parameters<typeof fakeContext>[0]['routes'],
  credentials?: Record<string, string>,
) => {
  const fake = fakeContext({ routes, credentials });
  await monitoringAlertingCheck.run(fake.ctx);
  return fake;
};

describe('monitoringAlertingCheck', () => {
  it('passes a rule routed to an enabled destination', async () => {
    const { passed, failed } = await run({
      '/v2/alerts/rules': [makeRule()],
      '/v2/alerts/destinations': [makeDestination()],
    });
    expect(failed).toEqual([]);
    expect(passed).toEqual(['alrt_1', 'alerting-summary']);
  });

  it('fails when there are no enabled rules', async () => {
    const { failed } = await run({
      '/v2/alerts/rules': [makeRule({ enabled: false })],
      '/v2/alerts/destinations': [makeDestination()],
    });
    expect(failed).toEqual(['alert-rules']);
  });

  it('fails when no destination is enabled', async () => {
    const { failed } = await run({
      '/v2/alerts/rules': [makeRule()],
      '/v2/alerts/destinations': [makeDestination({ enabled: false })],
    });
    expect(failed).toContain('alert-destinations');
    expect(failed).toContain('alrt_1');
  });

  it('fails a rule whose only destination was deleted', async () => {
    const { failed } = await run({
      '/v2/alerts/rules': [makeRule({ destination_ids: ['dest_gone'] })],
      '/v2/alerts/destinations': [makeDestination()],
    });
    expect(failed).toEqual(['alrt_1']);
  });

  it('fails a rule with an evaluation error', async () => {
    const { failed } = await run({
      '/v2/alerts/rules': [makeRule({ last_evaluation_error: 'unknown column' })],
      '/v2/alerts/destinations': [makeDestination()],
    });
    expect(failed).toEqual(['alrt_1']);
  });

  it('reports a missing scope instead of throwing', async () => {
    const { failed } = await run({
      '/v2/alerts/rules': httpError(403),
      '/v2/alerts/destinations': [],
    });
    expect(failed).toEqual(['alert rules']);
  });

  it('uses the region and self-hosted URL from credentials', async () => {
    const routes = {
      '/v2/alerts/rules': [makeRule()],
      '/v2/alerts/destinations': [makeDestination()],
    };
    expect((await run(routes)).calls[0]?.baseUrl).toBe(MAPLE_US_API_URL);
    expect((await run(routes, { api_key: 'k', region: 'eu' })).calls[0]?.baseUrl).toBe(
      MAPLE_EU_API_URL,
    );
    expect(
      (await run(routes, { api_key: 'k', base_url: 'https://maple.internal/' })).calls[0]?.baseUrl,
    ).toBe('https://maple.internal');
  });

  it('refuses a non-HTTPS self-hosted URL', async () => {
    const { failed, calls } = await run(
      { '/v2/alerts/rules': [], '/v2/alerts/destinations': [] },
      { api_key: 'k', base_url: 'http://maple.internal' },
    );
    expect(failed).toEqual(['connection']);
    expect(calls).toEqual([]);
  });
});
