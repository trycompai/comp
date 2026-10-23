/**
 * Helpers shared by the CybeDefend tests.
 *
 * They exist so the tests stay readable under `noUncheckedIndexedAccess` and
 * `strict` without reaching for casts.
 */

/** Reads an element that the test expects to be there, failing loudly if not. */
export const at = <T>(items: readonly T[], index: number): T => {
  const item = items[index];

  if (item === undefined) {
    throw new Error(
      `expected an element at index ${index}, but only ${items.length} were recorded`,
    );
  }

  return item;
};

/** Awaits a promise that is expected to reject, and returns the rejection. */
export const rejectionOf = async (promise: Promise<unknown>): Promise<Error> => {
  try {
    await promise;
  } catch (thrown) {
    if (thrown instanceof Error) return thrown;
    throw thrown;
  }

  throw new Error('expected the call to reject, but it resolved');
};
