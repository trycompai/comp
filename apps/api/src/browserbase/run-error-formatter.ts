export interface RunErrorMessage {
  userFacing: string;
  needsReauth: boolean;
}

const SESSION_ENDED_MESSAGE =
  'Browser session ended before we could capture evidence. Please retry.';
const TIMEOUT_MESSAGE =
  'Automation timed out before completing. Please retry — if this keeps happening, simplify the instruction or check the target site.';
const GENERIC_MESSAGE =
  'Automation failed to complete. Please retry — see run error details for specifics.';

/**
 * Check whether an error was thrown because Browserbase/Stagehand's active page
 * went away (session closed, page navigated, CDP died). These strings are tied
 * to upstream SDK error text — if the SDK renames them, this predicate needs
 * to be updated and callers may silently fall through to generic handling.
 */
export function isNoPageError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : '';
  return (
    message.includes('awaitActivePage') ||
    message.includes('no page available') ||
    message.includes('No page found')
  );
}

/**
 * Translate a thrown error into a short, user-readable message for the
 * BrowserAutomationRun.error field. The raw error is still logged upstream
 * for server-side debugging.
 */
export function toRunErrorMessage(err: unknown): RunErrorMessage {
  if (isNoPageError(err)) {
    return { userFacing: SESSION_ENDED_MESSAGE, needsReauth: true };
  }

  const message = err instanceof Error ? err.message : '';
  const isTimeout =
    message.includes('timeout') ||
    message.includes('Timeout') ||
    message.includes('timed out');

  if (isTimeout) {
    return { userFacing: TIMEOUT_MESSAGE, needsReauth: false };
  }

  return { userFacing: GENERIC_MESSAGE, needsReauth: false };
}
