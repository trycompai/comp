import { describe, expect, it } from 'bun:test';
import { appAvailabilityCheck } from '../checks/app-availability';
import { backupLogsCheck } from '../checks/backup-logs';
import { backupRestorationTestCheck } from '../checks/backup-restoration-test';
import { employeeAccessCheck } from '../checks/employee-access';
import { makeBackupCtx } from './test-utils';

const TOKEN = { access_token: 'backup-jwt' };

function router(path: string, method: string | undefined, handlers: Record<string, unknown>) {
  if (path.includes('/Provider/Login') && method === 'POST') {
    return TOKEN;
  }
  for (const [key, value] of Object.entries(handlers)) {
    if (path.includes(key)) {
      if (value instanceof Error) {
        throw value;
      }
      return value;
    }
  }
  throw new Error(`Unexpected ${method} ${path}`);
}

describe('msp360-backup appAvailabilityCheck', () => {
  it('passes after Provider Login and Administrators ping', async () => {
    const { ctx, passed, failed } = makeBackupCtx({
      fetchImpl: async (path, init) =>
        router(path, init?.method, {
          '/Administrators': [{ Email: 'ops@example.com' }],
        }),
    });
    await appAvailabilityCheck.run(ctx);
    expect(failed).toHaveLength(0);
    expect(passed.some((r) => r.resourceId === 'msp360-backup')).toBe(true);
  });

  it('fails when credentials are missing', async () => {
    const { ctx, failed } = makeBackupCtx({
      credentials: {},
      fetchImpl: async () => {
        throw new Error('should not call API');
      },
    });
    await appAvailabilityCheck.run(ctx);
    expect(failed.length).toBeGreaterThan(0);
  });

  it('fails when the Administrators ping throws after login', async () => {
    const { ctx, failed } = makeBackupCtx({
      fetchImpl: async (path, init) =>
        router(path, init?.method, {
          '/Administrators': new Error('403 forbidden'),
        }),
    });
    await appAvailabilityCheck.run(ctx);
    expect(failed.some((r) => r.resourceId === 'msp360-backup')).toBe(true);
  });
});

describe('msp360-backup employeeAccessCheck', () => {
  it('emits one user row per administrator keyed by lowercased email', async () => {
    const { ctx, passed, failed, calls } = makeBackupCtx({
      fetchImpl: async (path, init) =>
        router(path, init?.method, {
          '/Administrators': [
            { Email: 'Ops@Example.com', FirstName: 'Ops', LastName: 'Person', Enabled: true },
            { Email: 'old@example.com', FirstName: 'Old', LastName: 'Admin', Enabled: false },
          ],
        }),
    });
    await employeeAccessCheck.run(ctx);
    expect(failed).toHaveLength(0);
    const users = passed.filter((r) => r.resourceType === 'user');
    expect(users).toHaveLength(2);
    expect(users.map((r) => r.resourceId).sort()).toEqual(['old@example.com', 'ops@example.com']);
    expect(calls.some((c) => c.path.includes('/Users'))).toBe(false);
  });

  it('fails when the administrator list is empty', async () => {
    const { ctx, failed } = makeBackupCtx({
      fetchImpl: async (path, init) =>
        router(path, init?.method, {
          '/Administrators': [],
        }),
    });
    await employeeAccessCheck.run(ctx);
    expect(failed.some((r) => r.resourceId === 'msp360-backup-admins')).toBe(true);
  });
});

describe('msp360-backup backupLogsCheck', () => {
  it('passes recent successful backups, fails error jobs, and treats stale success as paused', async () => {
    const now = new Date().toISOString();
    const stale = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    const { ctx, passed, failed } = makeBackupCtx({
      fetchImpl: async (path, init) =>
        router(path, init?.method, {
          '/Monitoring': [
            {
              PlanName: 'Files',
              ComputerName: 'ok-host',
              PlanType: 3,
              Status: 0,
              LastStart: now,
              PlanId: 'p-ok',
            },
            {
              PlanName: 'Image',
              ComputerName: 'bad-host',
              PlanType: 1,
              Status: 2,
              LastStart: now,
              PlanId: 'p-fail',
              ErrorMessage: 'disk full',
            },
            {
              PlanName: 'Old',
              ComputerName: 'stale-host',
              PlanType: 1,
              Status: 0,
              LastStart: stale,
              PlanId: 'p-stale',
            },
          ],
        }),
    });
    await backupLogsCheck.run(ctx);
    expect(passed.some((r) => r.resourceId === 'p-ok')).toBe(true);
    expect(failed.some((r) => r.resourceId === 'p-fail')).toBe(true);
    expect(failed.some((r) => r.resourceId === 'p-stale')).toBe(false);
    expect(passed.some((r) => r.resourceId === 'p-stale')).toBe(true);
  });

  it('fails Running/Unknown instead of treating them as paused', async () => {
    const now = new Date().toISOString();
    const { ctx, passed, failed } = makeBackupCtx({
      fetchImpl: async (path, init) =>
        router(path, init?.method, {
          '/Monitoring': [
            {
              PlanName: 'Running job',
              ComputerName: 'host',
              PlanType: 1,
              Status: 3,
              LastStart: now,
              PlanId: 'p-run',
            },
            {
              PlanName: 'Unknown job',
              ComputerName: 'host',
              PlanType: 1,
              Status: 4,
              LastStart: now,
              PlanId: 'p-unk',
            },
          ],
        }),
    });
    await backupLogsCheck.run(ctx);
    expect(failed.some((r) => r.resourceId === 'p-run')).toBe(true);
    expect(failed.some((r) => r.resourceId === 'p-unk')).toBe(true);
    expect(passed.some((r) => r.resourceId === 'p-run' || r.resourceId === 'p-unk')).toBe(false);
  });

  it('fails when monitoring has no in-scope backup plans', async () => {
    const { ctx, failed } = makeBackupCtx({
      fetchImpl: async (path, init) =>
        router(path, init?.method, {
          '/Monitoring': [{ PlanName: 'Restore files', PlanType: 4, Status: 0, LastStart: new Date().toISOString() }],
        }),
    });
    await backupLogsCheck.run(ctx);
    expect(failed.some((r) => r.resourceId === 'msp360-backup-plans')).toBe(true);
  });

  it('fails collection on a malformed monitoring payload', async () => {
    const { ctx, failed } = makeBackupCtx({
      fetchImpl: async (path, init) =>
        router(path, init?.method, {
          '/Monitoring': { unexpected: true },
        }),
    });
    await backupLogsCheck.run(ctx);
    expect(failed.some((r) => r.resourceId === 'msp360-monitoring')).toBe(true);
  });
});

describe('msp360-backup backupRestorationTestCheck', () => {
  it('passes when a restore-family plan succeeded in the last 90 days', async () => {
    const { ctx, passed, failed } = makeBackupCtx({
      fetchImpl: async (path, init) =>
        router(path, init?.method, {
          '/Monitoring': [
            {
              PlanName: 'Restore files',
              PlanType: 4,
              Status: 0,
              LastStart: new Date().toISOString(),
              PlanId: 'restore-1',
            },
          ],
        }),
    });
    await backupRestorationTestCheck.run(ctx);
    expect(failed).toHaveLength(0);
    expect(passed.some((r) => r.resourceId === 'restore-1')).toBe(true);
  });

  it('passes as not in scope when no successful restore exists in the window', async () => {
    const { ctx, passed, failed } = makeBackupCtx({
      fetchImpl: async (path, init) =>
        router(path, init?.method, {
          '/Monitoring': [
            {
              PlanName: 'Files backup',
              PlanType: 3,
              Status: 0,
              LastStart: new Date().toISOString(),
              PlanId: 'backup-only',
            },
          ],
        }),
    });
    await backupRestorationTestCheck.run(ctx);
    expect(failed).toHaveLength(0);
    expect(passed.some((r) => r.resourceId === 'msp360-restore-not-in-scope')).toBe(true);
  });

  it('fails a restore-family job that ran in the window with an error status', async () => {
    const { ctx, passed, failed } = makeBackupCtx({
      fetchImpl: async (path, init) =>
        router(path, init?.method, {
          '/Monitoring': [
            {
              PlanName: 'SQLResore',
              PlanType: 'SQLResore',
              Status: 2,
              LastStart: new Date().toISOString(),
              PlanId: 'restore-fail',
              ErrorMessage: 'disk missing',
            },
          ],
        }),
    });
    await backupRestorationTestCheck.run(ctx);
    expect(failed.some((r) => r.resourceId === 'restore-fail')).toBe(true);
    expect(passed.some((r) => r.resourceId === 'msp360-restore-not-in-scope')).toBe(false);
  });

  it('fails collection on a malformed monitoring payload instead of N/A', async () => {
    const { ctx, failed, passed } = makeBackupCtx({
      fetchImpl: async (path, init) =>
        router(path, init?.method, {
          '/Monitoring': { foo: 1 },
        }),
    });
    await backupRestorationTestCheck.run(ctx);
    expect(failed.some((r) => r.resourceId === 'msp360-restore-monitoring')).toBe(true);
    expect(passed.some((r) => r.resourceId === 'msp360-restore-not-in-scope')).toBe(false);
  });
});
