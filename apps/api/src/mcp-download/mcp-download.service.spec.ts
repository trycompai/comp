import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { McpDownloadService } from './mcp-download.service';

function releasesPayload() {
  return [
    // A product release with no MCP assets — must be skipped.
    { tag_name: 'v3.79.1', draft: false, assets: [] },
    // The latest MCP release.
    {
      tag_name: 'apps/mcp-server/v0.2.0',
      draft: false,
      assets: [
        {
          name: 'mcp-server.mcpb',
          browser_download_url: 'https://gh/dl/v0.2.0/mcp-server.mcpb',
        },
        {
          name: 'mcp-server-bun-darwin-arm64',
          browser_download_url:
            'https://gh/dl/v0.2.0/mcp-server-bun-darwin-arm64',
        },
      ],
    },
    // An older MCP release — must not win.
    {
      tag_name: 'apps/mcp-server/v0.1.0',
      draft: false,
      assets: [
        {
          name: 'mcp-server.mcpb',
          browser_download_url: 'https://gh/dl/v0.1.0/mcp-server.mcpb',
        },
      ],
    },
  ];
}

describe('McpDownloadService', () => {
  let service: McpDownloadService;
  let fetchSpy: jest.SpyInstance<Promise<Response>, Parameters<typeof fetch>>;

  beforeEach(() => {
    service = new McpDownloadService();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  function mockReleasesOnce(payload: unknown, status = 200) {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(payload), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  }

  it('resolves a target to the asset URL on the latest MCP release', async () => {
    mockReleasesOnce(releasesPayload());

    const url = await service.resolveDownloadUrl('claude-desktop');

    // Picked v0.2.0, not the older v0.1.0, and ignored the product release.
    expect(url).toBe('https://gh/dl/v0.2.0/mcp-server.mcpb');
  });

  it('maps each platform target to its stable asset', async () => {
    mockReleasesOnce(releasesPayload());

    const macos = await service.resolveDownloadUrl('macos-arm64');

    expect(macos).toBe('https://gh/dl/v0.2.0/mcp-server-bun-darwin-arm64');
  });

  it('rejects an unknown target without calling GitHub', async () => {
    await expect(service.resolveDownloadUrl('bogus')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('404s when the asset is missing on the latest release', async () => {
    // Latest MCP release ships only the .mcpb, not the windows binary.
    mockReleasesOnce([
      {
        tag_name: 'apps/mcp-server/v0.2.0',
        draft: false,
        assets: [
          {
            name: 'mcp-server.mcpb',
            browser_download_url: 'https://gh/dl/v0.2.0/mcp-server.mcpb',
          },
        ],
      },
    ]);

    await expect(
      service.resolveDownloadUrl('windows-x64'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('caches the release lookup across requests', async () => {
    mockReleasesOnce(releasesPayload());

    await service.resolveDownloadUrl('claude-desktop');
    await service.resolveDownloadUrl('macos-arm64');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('serves a stale cached release if a later GitHub lookup fails', async () => {
    mockReleasesOnce(releasesPayload());
    await service.resolveDownloadUrl('claude-desktop'); // primes the cache

    // Force the cache to look expired, then make the refresh fail.
    (service as unknown as { cache: { fetchedAt: number } }).cache.fetchedAt = 0;
    fetchSpy.mockRejectedValueOnce(new Error('network down'));

    const url = await service.resolveDownloadUrl('claude-desktop');
    expect(url).toBe('https://gh/dl/v0.2.0/mcp-server.mcpb');
  });

  it('throws ServiceUnavailable when GitHub fails and there is no cache', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 503 }));

    await expect(
      service.resolveDownloadUrl('claude-desktop'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws when no MCP-tagged release exists in the page', async () => {
    mockReleasesOnce([{ tag_name: 'v3.79.1', draft: false, assets: [] }]);

    await expect(
      service.resolveDownloadUrl('claude-desktop'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
