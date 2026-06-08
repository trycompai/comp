export async function runConcurrent<T>(params: {
  concurrency: number;
  items: readonly T[];
  run(item: T, index: number): Promise<void>;
}): Promise<void> {
  if (params.items.length === 0) return;
  const workerCount = Math.min(
    Math.max(1, Math.floor(params.concurrency)),
    params.items.length,
  );
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < params.items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await params.run(params.items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: workerCount }, () => runWorker()),
  );
}
