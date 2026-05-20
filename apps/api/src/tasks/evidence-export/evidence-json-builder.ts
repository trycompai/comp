import { configure as configureStringify } from 'safe-stable-stringify';
import { redactSensitiveData } from './evidence-redaction';
import type {
  TaskEvidenceSummary,
  NormalizedAutomation,
} from './evidence-export.types';

const safeStringify = configureStringify({
  bigint: true,
  circularValue: '[Circular]',
  deterministic: false,
});

export function buildAutomationJson(
  summary: TaskEvidenceSummary,
  automation: NormalizedAutomation,
): string {
  return (
    safeStringify(
      redactSensitiveData({
        automation: {
          id: automation.id,
          name: automation.name,
          type: automation.type,
          integrationName: automation.integrationName,
          totalRuns: automation.totalRuns,
          successfulRuns: automation.successfulRuns,
          failedRuns: automation.failedRuns,
          latestRunAt: automation.latestRunAt,
        },
        runs: automation.runs.map(
          ({ type, automationName, automationId, ...run }) => run,
        ),
        exportedAt: summary.exportedAt,
      }),
      null,
      2,
    ) ?? '{}'
  );
}
