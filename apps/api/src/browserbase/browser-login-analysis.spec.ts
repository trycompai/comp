import {
  analyzeDetectedLogin,
  manualLoginAnalysis,
  type LoginDetection,
} from './browser-login-analysis';

const base: LoginDetection = {
  reachable: true,
  hasPasswordField: false,
  identifierType: 'unknown',
  ssoProviders: [],
  hasPasskey: false,
  extraFields: [],
};

describe('analyzeDetectedLogin', () => {
  it('recommends "ready" when a password field is present', () => {
    const result = analyzeDetectedLogin({
      ...base,
      hasPasswordField: true,
      identifierType: 'email',
    });
    expect(result.recommendation.category).toBe('ready');
    expect(result.detectedMethods).toContain('password');
  });

  it('recommends check-ins for SSO-only sites', () => {
    const result = analyzeDetectedLogin({ ...base, ssoProviders: ['Google'] });
    expect(result.recommendation.category).toBe('works_with_checkins');
    expect(result.detectedMethods).toContain('sso');
  });

  it('recommends check-ins for passkey-only sites', () => {
    const result = analyzeDetectedLogin({ ...base, hasPasskey: true });
    expect(result.recommendation.category).toBe('works_with_checkins');
    expect(result.detectedMethods).toContain('passkey');
  });

  it('prefers the password path (ready) when both password and SSO exist', () => {
    const result = analyzeDetectedLogin({
      ...base,
      hasPasswordField: true,
      ssoProviders: ['Google'],
    });
    expect(result.recommendation.category).toBe('ready');
    expect(result.detectedMethods).toEqual(
      expect.arrayContaining(['password', 'sso']),
    );
  });

  it('falls back to manual when nothing is detected', () => {
    expect(analyzeDetectedLogin(base).recommendation.category).toBe('manual');
  });

  it('falls back to manual when the page is unreachable, even with a password field', () => {
    const result = analyzeDetectedLogin({
      ...base,
      reachable: false,
      hasPasswordField: true,
    });
    expect(result.recommendation.category).toBe('manual');
  });

  it('passes extra fields through unchanged', () => {
    const result = analyzeDetectedLogin({
      ...base,
      hasPasswordField: true,
      extraFields: [{ label: 'Workspace URL' }],
    });
    expect(result.extraFields).toEqual([{ label: 'Workspace URL' }]);
  });
});

describe('manualLoginAnalysis', () => {
  it('is an unreachable, manual recommendation', () => {
    const result = manualLoginAnalysis();
    expect(result.reachable).toBe(false);
    expect(result.recommendation.category).toBe('manual');
    expect(result.detectedMethods).toEqual([]);
  });
});
