import { generateObject } from 'ai';
import { BrowserMfaInstructionsService } from './browser-mfa-instructions.service';

jest.mock('ai', () => ({ generateObject: jest.fn() }));
jest.mock('@ai-sdk/anthropic', () => ({ anthropic: () => 'mock-model' }));

const mockGenerate = generateObject as jest.MockedFunction<typeof generateObject>;

// Minimal shape the service reads from generateObject's result.
const asResult = (object: { steps: string[]; confident: boolean }) =>
  ({ object }) as unknown as Awaited<ReturnType<typeof generateObject>>;

describe('BrowserMfaInstructionsService', () => {
  let service: BrowserMfaInstructionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BrowserMfaInstructionsService();
  });

  it('returns generated steps when the model is confident', async () => {
    mockGenerate.mockResolvedValueOnce(
      asResult({ steps: ['Open Security', 'Add authenticator'], confident: true }),
    );

    const result = await service.getInstructions('https://github.com/login');

    expect(result.hostname).toBe('github.com');
    expect(result.source).toBe('generated');
    expect(result.confident).toBe(true);
    expect(result.steps).toEqual(['Open Security', 'Add authenticator']);
    expect(result.tips.length).toBeGreaterThan(0);
  });

  it('falls back to universal steps when the model is not confident', async () => {
    mockGenerate.mockResolvedValueOnce(
      asResult({ steps: ['A guessed step'], confident: false }),
    );

    const result = await service.getInstructions('obscure-vendor.example.com');

    expect(result.source).toBe('fallback');
    expect(result.confident).toBe(false);
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
});
