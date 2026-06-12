import {
  buildAdditionalContext,
  MAX_ADDITIONAL_CONTEXT_LENGTH,
  normalizeTargetUrl,
} from './finding-context.util';

describe('normalizeTargetUrl', () => {
  it('lowercases the host and strips trailing slashes', () => {
    expect(normalizeTargetUrl('https://App.Example.com/')).toBe(
      'https://app.example.com',
    );
  });

  it('strips trailing slashes from paths but keeps the path itself', () => {
    expect(normalizeTargetUrl('https://app.example.com/portal/')).toBe(
      'https://app.example.com/portal',
    );
  });

  it('drops URL fragments', () => {
    expect(normalizeTargetUrl('https://app.example.com/#section')).toBe(
      'https://app.example.com',
    );
  });

  it('keeps query strings', () => {
    expect(normalizeTargetUrl('https://app.example.com/?env=staging')).toBe(
      'https://app.example.com/?env=staging',
    );
  });

  it('preserves a trailing slash that belongs to a query value', () => {
    expect(
      normalizeTargetUrl('https://app.example.com/?next=/portal/'),
    ).toBe('https://app.example.com/?next=/portal/');
  });

  it('strips path trailing slashes while keeping the query intact', () => {
    expect(normalizeTargetUrl('https://app.example.com/app/?v=2')).toBe(
      'https://app.example.com/app?v=2',
    );
  });

  it('returns non-URL input trimmed', () => {
    expect(normalizeTargetUrl('  not a url  ')).toBe('not a url');
  });
});

describe('buildAdditionalContext', () => {
  it('returns undefined when there is nothing to send', () => {
    expect(
      buildAdditionalContext({ findingContexts: [] }),
    ).toBeUndefined();
    expect(
      buildAdditionalContext({
        userProvidedContext: '   ',
        findingContexts: [],
      }),
    ).toBeUndefined();
  });

  it('returns only the user-provided context when there are no notes', () => {
    expect(
      buildAdditionalContext({
        userProvidedContext: '  Focus on auth flows.  ',
        findingContexts: [],
      }),
    ).toBe('Focus on auth flows.');
  });

  it('formats stored notes as a numbered list with titles', () => {
    const result = buildAdditionalContext({
      findingContexts: [
        { issueTitle: 'appConfiguration read access', context: 'By design.' },
        { issueTitle: 'Storage attachment access', context: 'Hardened.' },
      ],
    });

    expect(result).toContain('1. "appConfiguration read access": By design.');
    expect(result).toContain('2. "Storage attachment access": Hardened.');
    expect(result).toContain('Customer-provided context');
  });

  it('places the user context before the stored notes', () => {
    const result = buildAdditionalContext({
      userProvidedContext: 'Retest of the May findings.',
      findingContexts: [{ issueTitle: 'Issue A', context: 'Fixed.' }],
    });

    expect(result).toBeDefined();
    const userIndex = (result as string).indexOf('Retest of the May findings.');
    const notesIndex = (result as string).indexOf('1. "Issue A": Fixed.');
    expect(userIndex).toBeGreaterThanOrEqual(0);
    expect(notesIndex).toBeGreaterThan(userIndex);
  });

  it('does not add an omission marker when everything fits', () => {
    const result = buildAdditionalContext({
      userProvidedContext: 'User intent.',
      findingContexts: [{ issueTitle: 'Issue A', context: 'Fixed.' }],
    });

    expect(result).not.toContain('omitted for length');
  });

  it('caps the composed briefing, keeping user context and marking omitted notes', () => {
    const findingContexts = Array.from({ length: 30 }, (_, i) => ({
      issueTitle: `Finding ${i + 1}`,
      context: 'x'.repeat(1900),
    }));

    const result = buildAdditionalContext({
      userProvidedContext: 'User intent.',
      findingContexts,
    });

    expect(result).toBeDefined();
    expect((result as string).length).toBeLessThanOrEqual(
      MAX_ADDITIONAL_CONTEXT_LENGTH,
    );
    expect(result).toContain('User intent.');
    expect(result).toContain('1. "Finding 1"');
    expect(result).toMatch(/\d+ more notes omitted for length/);
    // Whole notes are dropped, never cut: every included note line ends
    // with its full 1900-char body.
    const includedBodies = (result as string).match(/x{1900}/g) ?? [];
    expect(includedBodies.length).toBeGreaterThan(0);
    expect(result).not.toMatch(/x{1901,}/);
  });
});
