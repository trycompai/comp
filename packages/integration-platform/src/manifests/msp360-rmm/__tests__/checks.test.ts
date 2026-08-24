import { describe, expect, it } from 'bun:test';
import type { CheckContext, CheckFindingResult, CheckPassingResult } from '../../../types';
import { deviceListCheck } from '../checks/device-list';
import { infrastructureInventoryCheck } from '../checks/infrastructure-inventory';
import { monitoringAlertingCheck } from '../checks/monitoring-alerting';
import { secureDevicesCheck } from '../checks/secure-devices';

function makeRmmCtx(fetchImpl: (path: string) => Promise<unknown>): {
  ctx: CheckContext;
  passed: CheckPassingResult[];
  failed: CheckFindingResult[];
} {
  const passed: CheckPassingResult[] = [];
  const failed: CheckFindingResult[] = [];
  const ctx: CheckContext = {
    accessToken: '',
    credentials: { api_key: 'rmm-token' },
    variables: {},
    connectionId: 'conn_1',
    organizationId: 'org_1',
    metadata: {},
    log: () => {},
    warn: () => {},
    error: () => {},
    pass: (result) => {
      passed.push(result);
    },
    fail: (result) => {
      failed.push(result);
    },
    fetch: (async (path: string) => fetchImpl(path)) as CheckContext['fetch'],
    post: (async () => {
      throw new Error('RMM checks should not POST');
    }) as CheckContext['post'],
    fetchAllPages: (async () => []) as CheckContext['fetchAllPages'],
    graphql: (async () => ({})) as CheckContext['graphql'],
  } as CheckContext;
  return { ctx, passed, failed };
}

function page(data: unknown[]) {
  return { data, total: data.length };
}

describe('msp360-rmm deviceListCheck', () => {
  it('passes one device row per hid', async () => {
    const { ctx, passed, failed } = makeRmmCtx(async (path) => {
      if (path.includes('/host/')) {
        return page([{ hid: 'h1', computerName: 'laptop-1', os: 'Windows 11' }]);
      }
      throw new Error(path);
    });
    await deviceListCheck.run(ctx);
    expect(failed).toHaveLength(0);
    expect(passed.some((r) => r.resourceType === 'device' && r.resourceId === 'h1')).toBe(true);
  });

  it('fails when the host list is empty', async () => {
    const { ctx, failed } = makeRmmCtx(async (path) => {
      if (path.includes('/host/')) return page([]);
      throw new Error(path);
    });
    await deviceListCheck.run(ctx);
    expect(failed.length).toBeGreaterThan(0);
  });
});

describe('msp360-rmm secureDevicesCheck', () => {
  it('passes hosts with active AV and does not invent BitLocker', async () => {
    const { ctx, passed, failed } = makeRmmCtx(async (path) => {
      if (path.includes('/host/')) return page([{ hid: 'h1', computerName: 'laptop-1' }]);
      if (path.includes('/antivirus/')) {
        return page([{ hid: 'h1', productName: 'Defender', enabled: true }]);
      }
      if (path.includes('/summary/')) return page([{ hid: 'h1' }]);
      throw new Error(path);
    });
    await secureDevicesCheck.run(ctx);
    expect(failed.filter((r) => r.resourceId === 'h1')).toHaveLength(0);
    expect(passed.some((r) => r.resourceId === 'h1')).toBe(true);
    expect(passed.some((r) => r.resourceId === 'msp360-rmm-unverified-encryption-screenlock')).toBe(
      true,
    );
  });

  it('fails hosts with no antivirus', async () => {
    const { ctx, failed } = makeRmmCtx(async (path) => {
      if (path.includes('/host/')) return page([{ hid: 'h2', computerName: 'bare' }]);
      if (path.includes('/antivirus/')) return page([]);
      if (path.includes('/summary/')) return page([]);
      throw new Error(path);
    });
    await secureDevicesCheck.run(ctx);
    expect(failed.some((r) => r.resourceId === 'h2')).toBe(true);
  });
});

describe('msp360-rmm monitoringAlertingCheck', () => {
  it('passes when summary returns rows even if alerts are open', async () => {
    const { ctx, passed, failed } = makeRmmCtx(async (path) => {
      if (path.includes('/summary/')) {
        return page([{ hid: 'h1', alerts: [{ severity: 'critical', message: 'disk' }] }]);
      }
      throw new Error(path);
    });
    await monitoringAlertingCheck.run(ctx);
    expect(failed).toHaveLength(0);
    expect(passed.length).toBeGreaterThan(0);
  });
});

describe('msp360-rmm infrastructureInventoryCheck', () => {
  it('joins hardware and software by hid', async () => {
    const { ctx, passed, failed } = makeRmmCtx(async (path) => {
      if (path.includes('/host/')) return page([{ hid: 'h1', computerName: 'srv' }]);
      if (path.includes('/hardware/')) return page([{ hid: 'h1', name: 'Disk0' }]);
      if (path.includes('/software/')) return page([{ hid: 'h1', name: 'Chrome' }]);
      throw new Error(path);
    });
    await infrastructureInventoryCheck.run(ctx);
    expect(failed).toHaveLength(0);
    const device = passed.find((r) => r.resourceId === 'h1');
    expect(device?.evidence).toMatchObject({ hid: 'h1' });
  });
});
