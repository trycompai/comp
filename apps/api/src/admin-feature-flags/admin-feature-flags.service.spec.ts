import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AdminFeatureFlagsService } from './admin-feature-flags.service';
import { PostHogService } from './posthog.service';

const originalEnv = { ...process.env };

describe('AdminFeatureFlagsService', () => {
  let service: AdminFeatureFlagsService;
  let posthog: { getClient: jest.Mock };
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  const mockClient = () => ({
    getAllFlags: jest.fn(),
    groupIdentify: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.POSTHOG_PERSONAL_API_KEY = 'phx_test';
    process.env.POSTHOG_PROJECT_ID = '123';
    process.env.POSTHOG_HOST = 'https://us.posthog.com';

    posthog = { getClient: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminFeatureFlagsService,
        { provide: PostHogService, useValue: posthog },
      ],
    }).compile();

    service = module.get(AdminFeatureFlagsService);
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 })) as any;
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    process.env = { ...originalEnv };
  });

  describe('listForOrganization', () => {
    it('returns [] when PostHog REST config is missing', async () => {
      delete process.env.POSTHOG_PERSONAL_API_KEY;
      const result = await service.listForOrganization('org_1');
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('refuses to follow a pagination `next` URL pointing to a foreign origin', async () => {
      const client = mockClient();
      client.getAllFlags.mockResolvedValue({});
      posthog.getClient.mockReturnValue(client);

      fetchSpy.mockImplementation((url) => {
        const host = new URL(String(url)).host;
        if (host === 'us.posthog.com') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                results: [
                  { id: 1, key: 'flag_a', name: '', active: true },
                ],
                next: 'https://evil.example.com/api/feature_flags/?cursor=abc',
              }),
              { status: 200 },
            ),
          );
        }
        throw new Error(`fetch should not be called with ${url}`);
      });

      const result = await service.listForOrganization('org_1');

      expect(result).toEqual([
        expect.objectContaining({ key: 'flag_a', enabled: false }),
      ]);
      // Only the first (trusted) page was fetched; evil origin was refused.
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('treats a multivariate variant string as enabled', async () => {
      const client = mockClient();
      client.getAllFlags.mockResolvedValue({
        'exp-flag': 'variant-a',
        'off-flag': false,
      });
      posthog.getClient.mockReturnValue(client);

      fetchSpy.mockResolvedValue(
        new Response(
          JSON.stringify({
            results: [
              { id: 1, key: 'exp-flag', name: '', active: true },
              { id: 2, key: 'off-flag', name: '', active: true },
            ],
            next: null,
          }),
          { status: 200 },
        ),
      );

      const result = await service.listForOrganization('org_1');

      const exp = result.find((f) => f.key === 'exp-flag');
      const off = result.find((f) => f.key === 'off-flag');
      expect(exp?.enabled).toBe(true);
      expect(off?.enabled).toBe(false);
    });
  });

  describe('setFlagForOrganization', () => {
    it('throws BadRequest when PostHog is not configured', async () => {
      posthog.getClient.mockReturnValue(null);
      await expect(
        service.setFlagForOrganization({
          orgId: 'org_1',
          flagKey: 'f',
          enabled: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('calls groupIdentify + flush with the flag key as a group property', async () => {
      const client = mockClient();
      posthog.getClient.mockReturnValue(client);

      const result = await service.setFlagForOrganization({
        orgId: 'org_1',
        orgName: 'Acme',
        flagKey: 'is-timeline-enabled',
        enabled: true,
      });

      expect(client.groupIdentify).toHaveBeenCalledWith({
        groupType: 'organization',
        groupKey: 'org_1',
        properties: { name: 'Acme', 'is-timeline-enabled': true },
      });
      expect(client.flush).toHaveBeenCalled();
      expect(result).toEqual({ key: 'is-timeline-enabled', enabled: true });
    });
  });
});
