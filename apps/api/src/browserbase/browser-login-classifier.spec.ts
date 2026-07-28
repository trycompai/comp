import {
  classifyTwoFactorMethod,
  safeOriginAndPath,
} from './browser-login-classifier';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;

describe('classifyTwoFactorMethod', () => {
  const makeStagehandWithExtract = (result: unknown) =>
    ({ extract: jest.fn().mockResolvedValue(result) }) as unknown as Stagehand;

  it('returns the classified method for each valid response', async () => {
    for (const method of [
      'code',
      'passkey',
      'passkey_only',
      'other',
    ] as const) {
      await expect(
        classifyTwoFactorMethod(makeStagehandWithExtract({ method })),
      ).resolves.toBe(method);
    }
  });

  it('degrades to "other" for a non-conforming or missing value', async () => {
    // Wrong shape (e.g. an outcome payload) — must not leak undefined.
    await expect(
      classifyTwoFactorMethod(makeStagehandWithExtract({ state: 'needs_2fa' })),
    ).resolves.toBe('other');
  });

  it('degrades to "other" when extraction throws', async () => {
    const stagehand = {
      extract: jest.fn().mockRejectedValue(new Error('boom')),
    } as unknown as Stagehand;
    await expect(classifyTwoFactorMethod(stagehand)).resolves.toBe('other');
  });
});

describe('safeOriginAndPath (keeps auth secrets out of the LLM prompt)', () => {
  it('drops the query and fragment (OAuth code/state/tokens)', () => {
    expect(
      safeOriginAndPath(
        'https://login.example.com/callback?code=SECRET&state=xyz#access_token=abc',
      ),
    ).toBe('https://login.example.com/callback');
  });

  it('drops userinfo', () => {
    expect(safeOriginAndPath('https://user:pass@example.com/app')).toBe(
      'https://example.com/app',
    );
  });

  it('returns empty string for an unparseable or empty URL', () => {
    expect(safeOriginAndPath('not a url')).toBe('');
    expect(safeOriginAndPath('')).toBe('');
  });
});
