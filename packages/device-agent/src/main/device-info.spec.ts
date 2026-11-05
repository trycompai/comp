import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execSyncMock = vi.fn();
vi.mock('node:child_process', () => ({
  execSync: (cmd: string) => execSyncMock(cmd),
}));

const REG_UBR_OUTPUT = [
  '',
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion',
  '    UBR    REG_DWORD    0x1b5c',
  '',
].join('\r\n');

function respondTo(responses: Record<string, string | Error>) {
  execSyncMock.mockImplementation((cmd: string) => {
    const match = Object.keys(responses).find((key) => cmd.includes(key));
    if (!match) return '';
    const response = responses[match];
    if (response instanceof Error) throw response;
    return response;
  });
}

describe('getDeviceInfo osVersion on Windows', () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    execSyncMock.mockReset();
    Object.defineProperty(process, 'platform', { value: 'win32' });
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('includes the update build revision so the patch level is visible', async () => {
    // [System.Environment]::OSVersion.Version always reports revision 0, so
    // every Windows 11 25H2 device read "10.0.26200.0" whatever its patch level.
    respondTo({ OSVersion: '10.0.26200.0', UBR: REG_UBR_OUTPUT });

    const { getDeviceInfo } = await import('./device-info');

    expect(getDeviceInfo().osVersion).toBe('10.0.26200.7004');
  });

  it('falls back to the base version when the UBR lookup fails', async () => {
    respondTo({ OSVersion: '10.0.26200.0', UBR: new Error('access denied') });

    const { getDeviceInfo } = await import('./device-info');

    expect(getDeviceInfo().osVersion).toBe('10.0.26200.0');
  });
});
