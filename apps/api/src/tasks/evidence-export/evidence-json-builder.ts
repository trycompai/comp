import { Readable } from 'node:stream';
import { configure as configureStringify } from 'safe-stable-stringify';
import { redactSensitiveData } from './evidence-redaction';
import type {
  TaskEvidenceSummary,
  NormalizedAutomation,
  NormalizedEvidenceRun,
} from './evidence-export.types';

const safeStringify = configureStringify({
  bigint: true,
  circularValue: '[Circular]',
  deterministic: false,
});

function stringifyAutomationMeta(header: NormalizedAutomation): string {
  return (
    safeStringify(
      redactSensitiveData({
        id: header.id,
        name: header.name,
        type: header.type,
        integrationName: header.integrationName,
        totalRuns: header.totalRuns,
        successfulRuns: header.successfulRuns,
        failedRuns: header.failedRuns,
        latestRunAt: header.latestRunAt,
      }),
      null,
      2,
    ) ?? '{}'
  );
}

function stringifyRun(run: NormalizedEvidenceRun): string {
  const { type, automationName, automationId, ...rest } = run;
  return safeStringify(redactSensitiveData(rest), null, 2) ?? '{}';
}

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

export function buildAutomationJsonStream({
  summary,
  header,
  runBatches,
}: {
  summary: TaskEvidenceSummary;
  header: NormalizedAutomation;
  runBatches: AsyncIterable<NormalizedEvidenceRun[]>;
}): Readable {
  async function* chunks(): AsyncGenerator<string> {
    yield `{\n  "automation": ${stringifyAutomationMeta(header)},\n  "runs": [\n`;

    let first = true;
    for await (const batch of runBatches) {
      for (const run of batch) {
        if (!first) yield ',\n';
        first = false;
        yield `    ${stringifyRun(run)}`;
      }
    }

    yield `\n  ],\n  "exportedAt": ${JSON.stringify(summary.exportedAt.toISOString())}\n}\n`;
  }

  return Readable.from(chunks(), { encoding: 'utf-8' });
}
