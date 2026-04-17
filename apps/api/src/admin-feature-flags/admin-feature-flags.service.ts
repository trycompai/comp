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

    const url = `${config.apiHost.replace(/\/$/, '')}/api/projects/${config.projectId}/feature_flags/?limit=200`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.error(
          `PostHog flag list failed: ${response.status} ${await response.text()}`,
        );
        return [];
      }

      const data = (await response.json()) as { results?: PostHogFlagListItem[] };
      return (data.results ?? []).filter((f) => !f.deleted);
    } catch (err) {
      this.logger.error('Failed to fetch flags from PostHog REST API', err);
      return [];
    }
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

    return flags
      .map((flag) => ({
        key: flag.key,
        name: flag.key,
        description: flag.name ?? '',
        active: flag.active,
        enabled: evaluated[flag.key] === true,
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

    client.groupIdentify({
      groupType: 'organization',
      groupKey: orgId,
      properties: {
        ...(orgName ? { name: orgName } : {}),
        [flagKey]: enabled,
      },
    });
    await client.flush();

    return { key: flagKey, enabled };
  }
}
