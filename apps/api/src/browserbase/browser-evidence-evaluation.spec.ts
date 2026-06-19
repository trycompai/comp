import type { BrowserEvidenceLog } from './browser-evidence-execution';
import {
  type BrowserEvidenceEvaluator,
  evaluateIfNeeded,
} from './browser-evidence-evaluation';

describe('evaluateIfNeeded', () => {
  it('marks evaluation extraction failures as failed evaluations', async () => {
    const logs: BrowserEvidenceLog[] = [];
    const stagehand: BrowserEvidenceEvaluator = {
      async extract() {
        throw new Error('extract failed');
      },
    };

    const result = await evaluateIfNeeded({
      stagehand,
      criteria: 'Dashboard is visible',
      logs,
    });

    expect(result).toEqual({
      success: false,
      evaluationStatus: 'fail',
      evaluationReason:
        'The automation captured evidence, but evaluation failed. Review the screenshot manually.',
      error:
        'The automation captured evidence, but evaluation failed. Review the screenshot manually.',
      failureCode: 'evaluation_failed',
      failureStage: 'evaluation',
    });
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: 'evaluation',
          message: 'extract failed',
        }),
      ]),
    );
  });
});
