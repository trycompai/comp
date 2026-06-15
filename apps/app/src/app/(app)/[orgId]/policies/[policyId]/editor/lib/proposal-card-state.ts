/**
 * Pure decision for how the proposePolicy tool card should render, derived from
 * the AI-SDK tool-part state, whether streaming stopped, and whether any policy
 * content actually arrived.
 *
 * - 'interrupted': the run stopped before the tool finished.
 * - 'working':     the tool is still running.
 * - 'error':       the tool errored.
 * - 'incomplete':  the tool "completed" but no content materialized — a
 *                  truncated run that must NOT be reported as success (CS-256).
 * - 'done':        completed with real content.
 */
export type ProposalCardState = 'interrupted' | 'working' | 'error' | 'incomplete' | 'done';

export function getProposalCardState(
  toolState: string,
  stopped: boolean,
  hasContent: boolean,
): ProposalCardState {
  const isCompleted = toolState === 'output-available';
  const isError = toolState === 'output-error';
  const isWorking = !isCompleted && !isError;

  if (isWorking && stopped) return 'interrupted';
  if (isWorking) return 'working';
  if (isError) return 'error';
  if (!hasContent) return 'incomplete';
  return 'done';
}
