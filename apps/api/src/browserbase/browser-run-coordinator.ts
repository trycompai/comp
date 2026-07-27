const DEFAULT_DOMAIN_THROTTLE_MS = 5_000;

const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class BrowserRunCoordinator {
  private readonly profileLocks = new Map<string, Promise<void>>();
  private readonly domainLocks = new Map<string, Promise<void>>();
  private readonly lastDomainRunAt = new Map<string, number>();

  async withProfileLock<T>({
    profileId,
    hostname,
    run,
  }: {
    profileId: string;
    hostname: string;
    run: () => Promise<T>;
  }): Promise<T> {
    const previous = this.profileLocks.get(profileId) ?? Promise.resolve();
    let release: () => void = () => {};
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chained = previous.then(() => current);
    this.profileLocks.set(profileId, chained);

    await previous;

    try {
      return await this.withDomainTurn({ hostname, run });
    } finally {
      release();
      if (this.profileLocks.get(profileId) === chained) {
        this.profileLocks.delete(profileId);
      }
    }
  }

  private async withDomainTurn<T>({
    hostname,
    run,
  }: {
    hostname: string;
    run: () => Promise<T>;
  }): Promise<T> {
    const previous = this.domainLocks.get(hostname) ?? Promise.resolve();
    let release: () => void = () => {};
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chained = previous.then(() => current);
    this.domainLocks.set(hostname, chained);

    await previous;

    try {
      await this.waitForDomainTurn(hostname);
      return await run();
    } finally {
      release();
      if (this.domainLocks.get(hostname) === chained) {
        this.domainLocks.delete(hostname);
      }
    }
  }

  private async waitForDomainTurn(hostname: string): Promise<void> {
    const throttleMs = parsePositiveInt(
      process.env.BROWSER_AUTOMATION_DOMAIN_THROTTLE_MS,
      DEFAULT_DOMAIN_THROTTLE_MS,
    );
    const now = Date.now();
    const lastRunAt = this.lastDomainRunAt.get(hostname) ?? 0;
    const waitMs = Math.max(0, lastRunAt + throttleMs - now);

    if (waitMs > 0) {
      await delay(waitMs);
    }

    this.lastDomainRunAt.set(hostname, Date.now());
  }
}

export const browserRunCoordinator = new BrowserRunCoordinator();
