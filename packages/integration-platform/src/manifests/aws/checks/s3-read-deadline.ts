const READ_TIMEOUT_MS = 30_000;

function readTimeout(): Error {
  return Object.assign(new Error('AWS metadata read exceeded its time budget'), {
    name: 'TimeoutError',
  });
}

/** Bound SDK retries and abort the request even when an endpoint never responds. */
export async function withS3ReadDeadline<T>({
  read,
  deadlineAt = Date.now() + READ_TIMEOUT_MS,
}: {
  read: (signal: AbortSignal) => Promise<T>;
  deadlineAt?: number;
}): Promise<T> {
  const timeoutMs = Math.min(READ_TIMEOUT_MS, deadlineAt - Date.now());
  if (timeoutMs <= 0) throw readTimeout();

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(readTimeout());
      controller.abort();
    }, timeoutMs);
  });

  try {
    // Racing also bounds collection if a custom SDK transport ignores abort.
    return await Promise.race([read(controller.signal), timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
