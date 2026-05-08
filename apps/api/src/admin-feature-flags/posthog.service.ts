import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PostHog } from 'posthog-node';

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private readonly logger = new Logger(PostHogService.name);
  private client: PostHog | null = null;
  private initialized = false;

  getClient(): PostHog | null {
    if (this.initialized) return this.client;

    // Prefer POSTHOG_API_KEY (explicit backend config) over the
    // NEXT_PUBLIC_* fallback so frontend env wiring can't accidentally
    // override the server key if both happen to be present.
    const apiKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const apiHost =
      process.env.POSTHOG_HOST ||
      process.env.NEXT_PUBLIC_POSTHOG_HOST ||
      'https://us.i.posthog.com';

    this.initialized = true;

    if (!apiKey) {
      this.logger.warn('PostHog API key not configured; feature flag operations will be no-ops');
      return null;
    }

    this.client = new PostHog(apiKey, {
      host: apiHost,
      flushAt: 1,
      flushInterval: 0,
    });
    return this.client;
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.shutdown();
    }
  }
}
