import { describe, expect, it } from 'vitest';
import { canInjectQuestionnaireUrl } from './content-script-injection';

describe('canInjectQuestionnaireUrl', () => {
  it('allows Google Forms and vendor questionnaire pages', () => {
    expect(canInjectQuestionnaireUrl('https://docs.google.com/forms/d/e/1/viewform')).toBe(true);
    expect(canInjectQuestionnaireUrl('https://vendor.example/security')).toBe(true);
  });

  it('skips protected app/API origins and browser pages', () => {
    expect(canInjectQuestionnaireUrl('http://localhost:3000/auth')).toBe(false);
    expect(canInjectQuestionnaireUrl('https://api.trycomp.ai/v1/auth/me')).toBe(false);
    expect(canInjectQuestionnaireUrl('chrome://extensions')).toBe(false);
  });
});
