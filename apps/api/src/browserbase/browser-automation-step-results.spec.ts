import { rollUpStepResults } from './browser-automation-step-results';
import type { BrowserEvidenceRunResult } from './browser-evidence-runner.service';

const step = (
  over: Partial<BrowserEvidenceRunResult>,
): BrowserEvidenceRunResult => ({
  success: true,
  status: 'completed',
  logs: [],
  ...over,
});

describe('rollUpStepResults', () => {
  it('passes a single result through verbatim', () => {
    const only = step({ evaluationStatus: 'pass', screenshotKey: 'k' });
    expect(rollUpStepResults([only])).toBe(only);
  });

  it('reports pass only when every step succeeded', () => {
    const rolled = rollUpStepResults([
      step({ evaluationStatus: 'pass' }),
      step({ evaluationStatus: 'pass' }),
    ]);
    expect(rolled.success).toBe(true);
    expect(rolled.evaluationStatus).toBe('pass');
  });

  it('does NOT report pass when a later step failed technically', () => {
    const rolled = rollUpStepResults([
      step({ evaluationStatus: 'pass' }),
      // Technical failure (e.g. timeout) — no verdict, success=false.
      step({ success: false, status: 'failed', failureCode: 'timeout' }),
    ]);
    expect(rolled.success).toBe(false);
    // Must be "couldn't verify" (undefined), never a misleading 'pass'.
    expect(rolled.evaluationStatus).toBeUndefined();
  });

  it('reports fail when any step check failed, regardless of others', () => {
    const rolled = rollUpStepResults([
      step({ evaluationStatus: 'pass' }),
      step({ success: false, status: 'failed', evaluationStatus: 'fail' }),
    ]);
    expect(rolled.evaluationStatus).toBe('fail');
    expect(rolled.success).toBe(false);
  });
});
