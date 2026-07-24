import { generateObject } from 'ai';
import { BrowserMfaInstructionsService } from './browser-mfa-instructions.service';

jest.mock('ai', () => ({ generateObject: jest.fn() }));
jest.mock('@ai-sdk/anthropic', () => ({ anthropic: () => 'mock-model' }));

const mockGenerate = generateObject as jest.MockedFunction<typeof generateObject>;

// Minimal shape the service reads from generateObject's result.
const asResult = (object: { steps: string[]; confident: boolean }) =>
  ({ object }) as unknown as Awaited<ReturnType<typeof generateObject>>;

const firecrawlOk = (markdown: string) =>
  ({
    ok: true,
    json: async () => ({
      success: true,
      data: { web: [{ url: 'https://docs.vendor.com/2fa', title: '2FA', markdown }] },
    }),
  }) as unknown as Response;

describe('BrowserMfaInstructionsService', () => {
  let service: BrowserMfaInstructionsService;
  let mockFetch: jest.Mock;
  const originalKey = process.env.FIRECRAWL_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    // Ungrounded by default (no web-search call) so the base cases are
    // deterministic; grounding tests opt in by setting the key + mocking fetch.
    delete process.env.FIRECRAWL_API_KEY;
    mockFetch = jest.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
    service = new BrowserMfaInstructionsService();
  });

  afterEach(() => {
    process.env.FIRECRAWL_API_KEY = originalKey;
    global.fetch = originalFetch;
  });

  it('returns generated steps when the model is confident', async () => {
    mockGenerate.mockResolvedValueOnce(
      asResult({ steps: ['Open Security', 'Add authenticator'], confident: true }),
    );

    const result = await service.getInstructions('https://github.com/login');

    expect(result.hostname).toBe('github.com');
    expect(result.source).toBe('generated');
    expect(result.confident).toBe(true);
    expect(result.grounded).toBe(false);
    expect(result.steps).toEqual(['Open Security', 'Add authenticator']);
    expect(result.tips.length).toBeGreaterThan(0);
    // No key → no web-search call.
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('strips markdown emphasis the model emits', async () => {
    mockGenerate.mockResolvedValueOnce(
      asResult({
        steps: ['Open **Settings**', 'Click `Password and authentication`'],
        confident: true,
      }),
    );

    const result = await service.getInstructions('github.com');

    expect(result.steps).toEqual([
      'Open Settings',
      'Click Password and authentication',
    ]);
  });

  it('falls back to universal steps when the model is not confident', async () => {
    mockGenerate.mockResolvedValueOnce(
      asResult({ steps: ['A guessed step'], confident: false }),
    );

    const result = await service.getInstructions('obscure-vendor.example.com');

    expect(result.source).toBe('fallback');
    expect(result.confident).toBe(false);
    expect(result.grounded).toBe(false);
    expect(result.steps).not.toContain('A guessed step');
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('falls back when generation throws', async () => {
    mockGenerate.mockRejectedValueOnce(new Error('model unavailable'));

    const result = await service.getInstructions('aws.amazon.com');

    expect(result.source).toBe('fallback');
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('caches per normalized host — a full URL and bare host share one entry', async () => {
    mockGenerate.mockResolvedValueOnce(
      asResult({ steps: ['Open Security'], confident: true }),
    );

    const first = await service.getInstructions('https://console.aws.amazon.com/iam');
    const second = await service.getInstructions('console.aws.amazon.com');

    expect(first.hostname).toBe('console.aws.amazon.com');
    expect(second).toEqual(first);
    // Second call served from cache → the model was only invoked once.
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it('grounds the prompt in vendor docs when Firecrawl returns results', async () => {
    process.env.FIRECRAWL_API_KEY = 'test-key';
    mockFetch.mockResolvedValueOnce(
      firecrawlOk('Go to Settings > Security > Add authenticator app and click "setup key".'),
    );
    mockGenerate.mockResolvedValueOnce(
      asResult({ steps: ['Open Settings', 'Add authenticator app'], confident: true }),
    );

    const result = await service.getInstructions('github.com');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.grounded).toBe(true);
    expect(result.source).toBe('generated');
    // The docs were injected into the generation prompt.
    const promptArg = mockGenerate.mock.calls[0][0].prompt as string;
    expect(promptArg).toContain('CURRENT VENDOR DOCS');
    expect(promptArg).toContain('setup key');
  });

  it('generates ungrounded when Firecrawl fails', async () => {
    process.env.FIRECRAWL_API_KEY = 'test-key';
    mockFetch.mockRejectedValueOnce(new Error('firecrawl down'));
    mockGenerate.mockResolvedValueOnce(
      asResult({ steps: ['Open Security'], confident: true }),
    );

    const result = await service.getInstructions('github.com');

    expect(result.grounded).toBe(false);
    expect(result.source).toBe('generated');
    const promptArg = mockGenerate.mock.calls[0][0].prompt as string;
    expect(promptArg).not.toContain('CURRENT VENDOR DOCS');
  });
});
