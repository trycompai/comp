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

  it('fails Windows hosts with no antivirus', async () => {
    const { ctx, failed } = makeRmmCtx(async (path) => {
      if (path.includes('/host/')) {
        return page([{ hid: 'h2', computerName: 'bare', osName: 'Windows 11', operationSystemID: 'Windows' }]);
      }
      if (path.includes('/antivirus/')) return page([]);
      if (path.includes('/summary/')) return page([]);
      throw new Error(path);
    });
    await secureDevicesCheck.run(ctx);
    expect(failed.some((r) => r.resourceId === 'h2')).toBe(true);
  });

  it('passes Linux hosts without antivirus as not applicable', async () => {
    const { ctx, passed, failed } = makeRmmCtx(async (path) => {
      if (path.includes('/host/')) {
        return page([
          {
            hid: 'linux-1',
            computerName: 'hetzner',
            osName: 'Debian GNU/Linux 13',
            operationSystemID: 'Linux',
            platformID: 'Unix',
          },
        ]);
      }
      if (path.includes('/antivirus/')) return page([]);
      if (path.includes('/summary/')) return page([]);
      throw new Error(path);
    });
    await secureDevicesCheck.run(ctx);
    expect(failed.filter((r) => r.resourceId === 'linux-1')).toHaveLength(0);
    expect(passed.some((r) => r.resourceId === 'linux-1')).toBe(true);
  });

  it('reads enabled AV from nested header/data envelopes', async () => {
    const hid = '6e6437dd-2fc8-427d-a220-6ff5926bedea';
    const { ctx, passed, failed } = makeRmmCtx(async (path) => {
      if (path.includes('/host/')) {
        return {
          items: [{ header: { hid, computerName: 'laptop-1' }, data: [{ computerName: 'laptop-1' }] }],
          total: 1,
        };
      }
      if (path.includes('/antivirus/')) {
        return {
          items: [
            {
              header: { hid: `{${hid.toUpperCase()}}`, computerName: 'laptop-1' },
              data: [{ displayName: 'Windows Defender', enabled: true }],
            },
          ],
          total: 1,
        };
      }
      if (path.includes('/summary/')) return { items: [], total: 0 };
      throw new Error(path);
    });
    await secureDevicesCheck.run(ctx);
    expect(failed.filter((r) => r.resourceId === hid)).toHaveLength(0);
    expect(passed.some((r) => r.resourceId === hid)).toBe(true);
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

  it('joins live envelope rows when hid braces differ', async () => {
    const hidBare = '3c934b6b-a47b-43f7-a458-c4d5610468b7';
    const hidBraced = '{3C934B6B-A47B-43F7-A458-C4D5610468B7}';
    const { ctx, passed, failed } = makeRmmCtx(async (path) => {
      if (path.includes('/host/')) {
        return { items: [{ header: { hid: hidBare, computerName: 'WIN-1' }, data: [{ computerName: 'WIN-1', osName: 'Windows' }] }], total: 1 };
      }
      if (path.includes('/hardware/')) {
        return { items: [{ header: { hid: hidBraced, computerName: 'WIN-1' }, data: [{ name: 'Disk0' }] }], total: 1 };
      }
      if (path.includes('/software/')) {
        return { items: [{ header: { hid: hidBraced, computerName: 'WIN-1' }, data: [{ name: 'Chrome' }] }], total: 1 };
      }
      throw new Error(path);
    });
    await infrastructureInventoryCheck.run(ctx);
    expect(failed).toHaveLength(0);
    const device = passed.find((r) => r.resourceId === hidBare);
    expect(device?.title).toContain('WIN-1');
    expect((device?.evidence as { hardware?: unknown[] } | undefined)?.hardware).toHaveLength(1);
  });
});
