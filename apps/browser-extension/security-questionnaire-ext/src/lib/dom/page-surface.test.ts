import { describe, expect, it } from 'vitest';
import {
  getPageSurface,
  shouldSkipQuestionnaireInjection,
} from './page-surface';

describe('page surface detection', () => {
  it('skips Comp app and API origins', () => {
    expect(
      shouldSkipQuestionnaireInjection(new URL('http://localhost:3000/auth')),
    ).toBe(true);
    expect(
      shouldSkipQuestionnaireInjection(new URL('http://localhost:3333/v1/auth/me')),
    ).toBe(true);
    expect(
      shouldSkipQuestionnaireInjection(new URL('https://app.staging.trycomp.ai/auth')),
    ).toBe(true);
  });

  it('allows non-Comp questionnaire pages', () => {
    expect(
      shouldSkipQuestionnaireInjection(new URL('https://vendor.example/security')),
    ).toBe(false);
  });

  it('skips dedicated AI assistant pages', () => {
    expect(shouldSkipQuestionnaireInjection(new URL('https://claude.ai/new'))).toBe(
      true,
    );
    expect(shouldSkipQuestionnaireInjection(new URL('https://chatgpt.com/'))).toBe(
      true,
    );
  });

  it('detects Google document surfaces', () => {
    expect(getPageSurface(new URL('https://docs.google.com/document/d/123'))).toBe(
      'docs',
    );
    expect(
      getPageSurface(new URL('https://docs.google.com/spreadsheets/d/123')),
    ).toBe('sheets');
    expect(getPageSurface(new URL('https://docs.google.com/forms/d/123'))).toBe(
      'forms',
    );
  });
});
