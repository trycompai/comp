import { beforeEach, describe, expect, it, vi } from 'vitest';

const execSyncMock = vi.fn();

vi.mock('node:child_process', () => ({
  execSync: (command: string) => execSyncMock(command),
}));

import { MacOSPasswordPolicyRemediation } from './password-policy';

describe('MacOSPasswordPolicyRemediation', () => {
  beforeEach(() => {
    execSyncMock.mockReset();
  });

  it('is guidance only, because macOS enforces no policy this agent can safely write', () => {
    const info = new MacOSPasswordPolicyRemediation().getInfo();

    expect(info.type).toBe('guide_only');
    expect(info.requiresAdmin).toBe(false);
  });

  it('never recommends the deprecated global policy store as the way to fix it', () => {
    const info = new MacOSPasswordPolicyRemediation().getInfo();
    const instructions = info.instructions.join('\n');

    expect(instructions).toContain('pwpolicy -setaccountpolicies');
    expect(instructions).toContain('is deprecated and is not enforced by macOS');
  });

  it('does not run any command and does not report success', async () => {
    const result = await new MacOSPasswordPolicyRemediation().remediate();

    // Reporting success re-ran the checks and showed a "policy set" toast while the check
    // kept failing, because `pwpolicy -setglobalpolicy` writes a store macOS ignores.
    expect(result.success).toBe(false);
    expect(execSyncMock).not.toHaveBeenCalled();
  });
});
