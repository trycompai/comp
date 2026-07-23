/**
 * A live activity timeline for an evidence run — the same "steps" the composer's
 * Test panel and the connect/sign-in flow show. Each engine log advances the
 * timeline (the prior active step becomes done, a new active step is appended),
 * and the whole snapshot is emitted so a Trigger.dev task can publish it to
 * realtime metadata for the UI to render.
 */
export interface EvidenceTimelineStep {
  /** Step label. */
  l: string;
  /** Clock timestamp, e.g. "06:02:14". */
  t: string;
  state: 'done' | 'active' | 'pending' | 'warn' | 'fail';
}

const clock = () =>
  new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export interface EvidenceTimeline {
  /** Advance the timeline with a new active step (marks the prior one done). */
  step: (label: string) => void;
  /** Set the final state of the last step (done/warn/fail). */
  finish: (state: EvidenceTimelineStep['state']) => void;
}

export function createEvidenceTimeline(
  onSteps?: (steps: EvidenceTimelineStep[]) => void,
): EvidenceTimeline {
  const steps: EvidenceTimelineStep[] = [];
  const emit = () => onSteps?.(steps.map((s) => ({ ...s })));
  return {
    step(label: string) {
      const last = steps[steps.length - 1];
      if (last?.state === 'active') last.state = 'done';
      steps.push({ l: label, t: clock(), state: 'active' });
      emit();
    },
    finish(state: EvidenceTimelineStep['state']) {
      const last = steps[steps.length - 1];
      if (last) last.state = state;
      emit();
    },
  };
}
