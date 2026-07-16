import { BrowserInstructionTestService } from './browser-instruction-test.service';
import type { BrowserbaseSessionService } from './browserbase-session.service';
import type { BrowserAuthProfileService } from './browser-auth-profile.service';
import type { BrowserEvidenceRunnerService } from './browser-evidence-runner.service';
import type {
  BrowserEvidenceRunResult,
  BrowserEvidenceSessionInput,
} from './browser-evidence-runner.service';

// The service imports the profile/runner services which pull in @db; mock it so
// the real Prisma client isn't instantiated at import time.
jest.mock('@db', () => ({ db: {} }));

const profile = {
  id: 'prof_1',
  hostname: 'app.example.com',
  contextId: 'ctx_1',
  vaultProvider: '1password',
  vaultExternalItemRef: 'op://vault/item',
  vaultConnectionId: 'vault',
};

function makeProfiles() {
  return {
    resolveProfileForTarget: jest.fn().mockResolvedValue(profile),
  };
}

/** A runner whose `executeEvidenceOnSession` streams a couple of stages, then returns `result`. */
function makeRunner(
  result: Partial<BrowserEvidenceRunResult> & { success: boolean; status: BrowserEvidenceRunResult['status'] },
) {
  return {
    executeEvidenceOnSession: jest.fn(
      async (input: BrowserEvidenceSessionInput) => {
        input.onLog?.({ timestamp: 't1', stage: 'navigation', message: 'Opening the page' });
        input.onLog?.({ timestamp: 't2', stage: 'action', message: 'Running instruction' });
        return { logs: [], ...result } as BrowserEvidenceRunResult;
      },
    ),
  };
}

const baseInput = {
  organizationId: 'org_1',
  taskId: 'task_1',
  profileId: 'prof_1',
  targetUrl: 'https://app.example.com/settings',
  instruction: 'Screenshot the MFA policy',
  evaluationCriteria: 'MFA is enforced',
  sessionId: 'sess_1',
};

function build(runner: ReturnType<typeof makeRunner>, profiles = makeProfiles()) {
  const service = new BrowserInstructionTestService(
    {} as unknown as BrowserbaseSessionService,
    profiles as unknown as BrowserAuthProfileService,
    runner as unknown as BrowserEvidenceRunnerService,
  );
  return { service, profiles };
}

describe('BrowserInstructionTestService', () => {
  it('runs the ad-hoc instruction through the evidence runner with synthetic ids', async () => {
    const runner = makeRunner({ success: true, status: 'completed', screenshotUrl: 'https://s3/x.png' });
    const { service, profiles } = build(runner);

    await service.testInstructionOnSession(baseInput);

    expect(profiles.resolveProfileForTarget).toHaveBeenCalledWith({
      organizationId: 'org_1',
      targetUrl: 'https://app.example.com/settings',
      profileId: 'prof_1',
    });
    const call = runner.executeEvidenceOnSession.mock.calls[0][0];
    expect(call.instruction).toBe('Screenshot the MFA policy');
    expect(call.evaluationCriteria).toBe('MFA is enforced');
    expect(call.sessionId).toBe('sess_1');
    expect(call.automationId).toContain('test-');
    expect(call.runId).toContain('test-');
    expect(call.profile.contextId).toBe('ctx_1');
  });

  it('streams accumulating steps and marks the last one done on success', async () => {
    const runner = makeRunner({ success: true, status: 'completed', screenshotUrl: 'https://s3/x.png' });
    const { service } = build(runner);
    const frames: { l: string; state: string }[][] = [];

    const result = await service.testInstructionOnSession({
      ...baseInput,
      onSteps: (steps) => frames.push(steps.map((s) => ({ l: s.l, state: s.state }))),
    });

    // First stage active, second stage flips the first to done and appends active.
    expect(frames[0]).toEqual([{ l: 'Opening the page', state: 'active' }]);
    expect(frames[1]).toEqual([
      { l: 'Opening the page', state: 'done' },
      { l: 'Running instruction', state: 'active' },
    ]);
    // Final frame: last step resolved to done.
    const last = frames[frames.length - 1];
    expect(last[last.length - 1]).toEqual({ l: 'Running instruction', state: 'done' });
    expect(result.success).toBe(true);
    expect(result.screenshotUrl).toBe('https://s3/x.png');
  });

  it('maps the runner verdict into the test result', async () => {
    const runner = makeRunner({
      success: true,
      status: 'completed',
      evaluationStatus: 'fail',
      evaluationReason: 'MFA optional',
      screenshotUrl: 'https://s3/x.png',
    });
    const { service } = build(runner);

    const result = await service.testInstructionOnSession(baseInput);

    expect(result.evaluationStatus).toBe('fail');
    expect(result.evaluationReason).toBe('MFA optional');
  });

  it('marks the last step failed when the run fails', async () => {
    const runner = makeRunner({
      success: false,
      status: 'failed',
      error: 'stuck',
      failureCode: 'action_failed',
    });
    const { service } = build(runner);
    let final: { state: string }[] = [];

    const result = await service.testInstructionOnSession({
      ...baseInput,
      onSteps: (steps) => (final = steps.map((s) => ({ state: s.state }))),
    });

    expect(final[final.length - 1].state).toBe('fail');
    expect(result.success).toBe(false);
    expect(result.error).toBe('stuck');
  });

  it('marks the last step as a warning when the connection needs reauth', async () => {
    const runner = makeRunner({
      success: false,
      status: 'blocked',
      needsReauth: true,
      error: 'session expired',
    });
    const { service } = build(runner);
    let final: { state: string }[] = [];

    await service.testInstructionOnSession({
      ...baseInput,
      onSteps: (steps) => (final = steps.map((s) => ({ state: s.state }))),
    });

    expect(final[final.length - 1].state).toBe('warn');
  });
});
