import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Stable, human-friendly download target -> the (version-less) GitHub release
 * asset name. The MCP server's release assets keep the same names across
 * versions, so we can resolve them by name on whatever the latest release is.
 */
const ASSET_BY_TARGET: Record<string, string> = {
  'claude-desktop': 'mcp-server.mcpb',
  'macos-arm64': 'mcp-server-bun-darwin-arm64',
  'linux-x64': 'mcp-server-bun-linux-x64-modern',
  'windows-x64': 'mcp-server-bun-windows-x64-modern.exe',
};

// The MCP server ships its own release stream (tag `apps/mcp-server/vX.Y.Z`),
// interleaved with the much more frequent product releases (`vX.Y.Z`). We page
// through the newest releases and pick the first one on the MCP stream.
const GITHUB_RELEASES_URL =
  'https://api.github.com/repos/trycompai/comp/releases?per_page=100';
const MCP_TAG_PREFIX = 'apps/mcp-server/';

// Cache the resolved release so a burst of downloads can't exhaust GitHub's
// unauthenticated API budget (60 req/hr/IP). 10 min keeps us at a handful of
// API calls per hour regardless of download volume.
const CACHE_TTL_MS = 10 * 60 * 1000;

interface ResolvedRelease {
  tag: string;
  /** asset filename -> browser_download_url */
  assets: Record<string, string>;
  fetchedAt: number;
}

interface GitHubRelease {
  tag_name: string;
  draft: boolean;
  assets: Array<{ name: string; browser_download_url: string }>;
}

@Injectable()
export class McpDownloadService {
  private readonly logger = new Logger(McpDownloadService.name);
  private cache: ResolvedRelease | null = null;

  static readonly TARGETS = Object.keys(ASSET_BY_TARGET);

  /**
   * Resolve a stable download target to the current GitHub CDN URL for that
   * asset on the latest MCP release. Throws NotFoundException for unknown
   * targets or missing assets.
   */
  async resolveDownloadUrl(target: string): Promise<string> {
    const assetName = ASSET_BY_TARGET[target];
    if (!assetName) {
      throw new NotFoundException(
        `Unknown download target '${target}'. Valid targets: ${McpDownloadService.TARGETS.join(
          ', ',
        )}.`,
      );
    }

    const release = await this.getLatestMcpRelease();
    const url = release.assets[assetName];
    if (!url) {
      throw new NotFoundException(
        `Asset '${assetName}' is not present on the latest MCP release (${release.tag}).`,
      );
    }
    return url;
  }

  private async getLatestMcpRelease(): Promise<ResolvedRelease> {
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache;
    }

    try {
      this.cache = await this.fetchLatestMcpRelease();
      return this.cache;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      // Prefer a slightly stale answer over a hard failure if GitHub blips.
      if (this.cache) {
        this.logger.warn(
          `GitHub lookup failed; serving stale MCP release ${this.cache.tag}: ${message}`,
        );
        return this.cache;
      }
      this.logger.error(`Failed to resolve latest MCP release: ${message}`);
      throw new ServiceUnavailableException(
        'Could not resolve the latest MCP server release. Please try again shortly.',
      );
    }
  }

  private async fetchLatestMcpRelease(): Promise<ResolvedRelease> {
    const response = await fetch(GITHUB_RELEASES_URL, {
      headers: {
        // GitHub rejects API requests without a User-Agent.
        'User-Agent': 'comp-ai-mcp-download',
        Accept: 'application/vnd.github+json',
        // Optional: lifts the rate limit to 5000/hr if a token is configured.
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub releases API returned ${response.status}`);
    }

    const releases = (await response.json()) as GitHubRelease[];
    // Releases are returned newest-first, so the first MCP-tagged, non-draft
    // release is the latest one.
    const latest = releases.find(
      (release) => !release.draft && release.tag_name.startsWith(MCP_TAG_PREFIX),
    );

    if (!latest) {
      throw new Error(
        `No release with tag prefix '${MCP_TAG_PREFIX}' in the latest 100 releases.`,
      );
    }

    const assets: Record<string, string> = {};
    for (const asset of latest.assets) {
      assets[asset.name] = asset.browser_download_url;
    }

    return { tag: latest.tag_name, assets, fetchedAt: Date.now() };
  }
}
