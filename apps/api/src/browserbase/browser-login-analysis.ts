import { z } from 'zod';

/**
 * What we can reliably read from a vendor's *first* sign-in page. Note: the
 * specific 2FA method (authenticator vs SMS vs push) usually isn't visible until
 * after the identifier/password step, so it is resolved during live sign-in — not
 * here. This detection is best-effort and always degrades to a manual fallback.
 */
export const loginDetectionSchema = z.object({
  reachable: z
    .boolean()
    .describe('Whether this looks like a real sign-in page we could read'),
  hasPasswordField: z
    .boolean()
    .describe('Whether a password input is present on the page'),
  identifierType: z
    .enum(['email', 'username', 'either', 'unknown'])
    .describe('What the first login field accepts'),
  ssoProviders: z
    .array(z.string())
    .describe(
      'Third-party sign-in buttons offered, e.g. Google, Microsoft, SSO',
    ),
  hasPasskey: z
    .boolean()
    .describe('Whether passkey / security-key sign-in is offered'),
  extraFields: z
    .array(z.object({ label: z.string() }))
    .describe(
      'Other required fields before the password, e.g. company, workspace, subdomain',
    ),
});

export type LoginDetection = z.infer<typeof loginDetectionSchema>;

export type LoginMethod = 'password' | 'sso' | 'passkey';

export type LoginRecommendationCategory =
  'ready' | 'works_with_checkins' | 'manual';

export interface LoginAnalysis {
  reachable: boolean;
  detectedMethods: LoginMethod[];
  identifierType: LoginDetection['identifierType'];
  extraFields: { label: string }[];
  recommendation: {
    category: LoginRecommendationCategory;
    headline: string;
    detail: string;
  };
}

const READY = {
  category: 'ready' as const,
  headline: "You're set.",
  detail:
    'Sign in once — we capture what the scheduler needs to sign in on its own from then on.',
};

const CHECKINS = {
  category: 'works_with_checkins' as const,
  headline: 'This will work — with an occasional check-in.',
  detail:
    'Runs reuse your session; when it expires we email you to sign in again. Runs pause, never fail silently.',
};

const MANUAL = {
  category: 'manual' as const,
  headline: "We couldn't read this site automatically.",
  detail: "Enter the sign-in details and we'll take it from there.",
};

/**
 * Turns raw page detection into a recommendation for the connect flow. Pure and
 * deterministic so it can be unit-tested without a browser.
 */
export function analyzeDetectedLogin(detection: LoginDetection): LoginAnalysis {
  const detectedMethods: LoginMethod[] = [];
  if (detection.hasPasswordField) detectedMethods.push('password');
  if (detection.ssoProviders.length > 0) detectedMethods.push('sso');
  if (detection.hasPasskey) detectedMethods.push('passkey');

  let recommendation: LoginAnalysis['recommendation'] = MANUAL;
  if (detection.reachable && detection.hasPasswordField) {
    // A password form means we can capture credentials + an authenticator key
    // and run fully unattended (the 2FA specifics surface during sign-in).
    recommendation = READY;
  } else if (
    detection.reachable &&
    (detection.ssoProviders.length > 0 || detection.hasPasskey)
  ) {
    // SSO / passkey can't be replayed unattended — session reuse + human re-auth.
    recommendation = CHECKINS;
  }

  return {
    reachable: detection.reachable,
    detectedMethods,
    identifierType: detection.identifierType,
    extraFields: detection.extraFields,
    recommendation,
  };
}

export function manualLoginAnalysis(): LoginAnalysis {
  return analyzeDetectedLogin({
    reachable: false,
    hasPasswordField: false,
    identifierType: 'unknown',
    ssoProviders: [],
    hasPasskey: false,
    extraFields: [],
  });
}
