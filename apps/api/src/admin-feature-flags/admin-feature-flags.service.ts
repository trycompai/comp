import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PostHogService } from './posthog.service';

export interface FlagState {
  key: string;
  name: string;
  description: string;
  active: boolean;
  enabled: boolean;
  createdAt: string | null;
}

interface PostHogFlagListItem {
  id: number;
  key: string;
  name: string;
  active: boolean;
  deleted?: boolean;
  created_at?: string;
}

@Injectable()
export class AdminFeatureFlagsService {
  private readonly logger = new Logger(AdminFeatureFlagsService.name);

  constructor(private readonly posthog: PostHogService) {}

  private getPostHogRestConfig(): { apiHost: string; apiKey: string; projectId: string } | null {
    const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
    const projectId = process.env.POSTHOG_PROJECT_ID;
    const apiHost =
      process.env.POSTHOG_HOST ||
      process.env.NEXT_PUBLIC_POSTHOG_HOST ||
      'https://us.posthog.com';

    if (!apiKey || !projectId) return null;
    return { apiHost, apiKey, projectId };
  }

  private async fetchFlagsFromPostHog(): Promise<PostHogFlagListItem[]> {
    const config = this.getPostHogRestConfig();
    if (!config) return [];

    const results: PostHogFlagListItem[] = [];
    const apiHost = config.apiHost.replace(/\/$/, '');
    const baseUrl = `${apiHost}/api/projects/${config.projectId}/feature_flags/`;
    let nextUrl: string | null = `${baseUrl}?limit=200`;
    // Hard cap so a misbehaving cursor can't loop forever.
    const maxPages = 25;

    // Only follow `next` links that point back to the configured PostHog
    // host. Without this check, a malicious PostHog response could redirect
    // pagination to an attacker-controlled host and leak the Authorization
    // header (which carries the personal API key) via SSRF.
    let expectedOrigin: string;
    try {
      expectedOrigin = new URL(apiHost).origin;
    } catch {
      this.logger.error(
        `POSTHOG_HOST is not a valid URL: "${apiHost}". Skipping flag fetch.`,
      );
      return [];
    }

    try {
      for (let page = 0; page < maxPages && nextUrl; page++) {
        let parsedNext: URL;
        try {
          parsedNext = new URL(nextUrl);
        } catch {
          this.logger.error(`Invalid PostHog pagination URL: ${nextUrl}`);
          break;
        }
        if (parsedNext.origin !== expectedOrigin) {
          this.logger.error(
            `Refusing to follow PostHog pagination to foreign origin: ${parsedNext.origin}`,
          );
          break;
        }

        const response: Response = await fetch(parsedNext.toString(), {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          this.logger.error(
            `PostHog flag list failed: ${response.status} ${await response.text()}`,
          );
          break;
        }

        const data = (await response.json()) as {
          results?: PostHogFlagListItem[];
          next?: string | null;
        };
        for (const f of data.results ?? []) {
          if (!f.deleted) results.push(f);
        }
        nextUrl = data.next ?? null;
      }
    } catch (err) {
      this.logger.error('Failed to fetch flags from PostHog REST API', err);
    }

    return results;
  }

  async listForOrganization(orgId: string): Promise<FlagState[]> {
    const flags = await this.fetchFlagsFromPostHog();
    const client = this.posthog.getClient();

    if (flags.length === 0 || !client) {
      return [];
    }

    // Evaluate all flags in one network call instead of one per flag.
    const distinctId = `admin-check:${orgId}`;
    let evaluated: Record<string, string | boolean> = {};
    try {
      evaluated = await client.getAllFlags(distinctId, {
        groups: { organization: orgId },
        disableGeoip: true,
      });
    } catch (err) {
      this.logger.error(`Failed to evaluate flags for org ${orgId}`, err);
    }

    // A flag is "on" for this org when the evaluator returns true (boolean
    // flags) OR any string variant key (multivariate flags — PostHog returns
    // the variant name for enabled variants, `false` for disabled).
    const isEnabled = (value: string | boolean | undefined): boolean =>
      value === true || (typeof value === 'string' && value.length > 0);

    return flags
      .map((flag) => ({
        key: flag.key,
        name: flag.key,
        description: flag.name ?? '',
        active: flag.active,
        enabled: isEnabled(evaluated[flag.key]),
        createdAt: flag.created_at ?? null,
      }))
      .sort((a, b) => {
        // Newest first; fall back to key for ties / missing dates.
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        return a.key.localeCompare(b.key);
      });
  }

  async setFlagForOrganization({
    orgId,
    orgName,
    flagKey,
    enabled,
  }: {
    orgId: string;
    orgName?: string;
    flagKey: string;
    enabled: boolean;
  }): Promise<{ key: string; enabled: boolean }> {
    if (!flagKey) {
      throw new BadRequestException('flagKey is required');
    }

    const client = this.posthog.getClient();
    if (!client) {
      throw new BadRequestException('PostHog is not configured on this environment');
    }

    try {
      client.groupIdentify({
        groupType: 'organization',
        groupKey: orgId,
        properties: {
          ...(orgName ? { name: orgName } : {}),
          [flagKey]: enabled,
        },
      });
      await client.flush();
    } catch (err) {
      this.logger.error(
        `Failed to set flag ${flagKey}=${enabled} for org ${orgId}`,
        err,
      );
      throw new BadRequestException(
        'Unable to update feature flag via PostHog. Please try again.',
      );
    }

    return { key: flagKey, enabled };
  }
}
