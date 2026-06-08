import type { ScanDebug, ScanDebugStep } from './types';
import { isRecord } from './message-utils';

export function getScanDebug(value: unknown): ScanDebug | null {
  if (!isRecord(value) || !isRecord(value.debug)) return null;
  const debug = value.debug;
  if (
    debug.surface !== 'sheets' &&
    debug.surface !== 'docs' &&
    debug.surface !== 'forms' &&
    debug.surface !== 'generic'
  ) {
    return null;
  }
  if (
    typeof debug.source !== 'string' ||
    typeof debug.questionCount !== 'number' ||
    typeof debug.updatedAt !== 'number' ||
    !Array.isArray(debug.steps)
  ) {
    return null;
  }

  return {
    surface: debug.surface,
    source: debug.source,
    questionCount: debug.questionCount,
    updatedAt: debug.updatedAt,
    steps: debug.steps.flatMap(parseStep),
  };
}

export function formatScanDebug(debug: ScanDebug): string {
  const header = `Scan debug: ${debug.questionCount} found; source=${debug.source}.`;
  const steps = debug.steps
    .slice(0, 8)
    .map((step) => {
      const count = typeof step.count === 'number' ? ` count=${step.count}` : '';
      const sample = step.sample ? ` sample="${step.sample}"` : '';
      return `${step.status} ${step.name}: ${step.detail}${count}${sample}`;
    })
    .join(' | ');
  return steps ? `${header} ${steps}` : header;
}

function parseStep(value: unknown): ScanDebugStep[] {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    typeof value.detail !== 'string' ||
    !isStepStatus(value.status)
  ) {
    return [];
  }
  return [{
    name: value.name,
    status: value.status,
    detail: value.detail,
    count: typeof value.count === 'number' ? value.count : undefined,
    sample: typeof value.sample === 'string' ? value.sample : undefined,
  }];
}

function isStepStatus(value: unknown): value is ScanDebugStep['status'] {
  return value === 'ok' || value === 'fail' || value === 'skip';
}
