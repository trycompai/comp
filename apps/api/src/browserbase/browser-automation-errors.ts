export type BrowserAutomationFailureCode =
  | 'needs_reauth'
  | 'needs_user_action'
  | 'rate_limited'
  | 'captcha_blocked'
  | 'timeout'
  | 'browser_session_lost'
  | 'evaluation_failed'
  | 'unknown';

export type BrowserAutomationFailureStage =
  | 'auth'
  | 'navigation'
  | 'action'
  | 'screenshot'
  | 'evaluation'
  | 'upload'
  | 'session'
  | 'unknown';

export interface ClassifiedBrowserAutomationError {
  code: BrowserAutomationFailureCode;
  stage: BrowserAutomationFailureStage;
  userFacing: string;
  needsReauth: boolean;
  blockedReason?: string;
}

const getErrorText = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string') return message;
  }
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const nestedError = error.error;
    if (typeof nestedError === 'string') return nestedError;
  }
  return String(error);
};

export function classifyBrowserAutomationError(
  error: unknown,
  stage: BrowserAutomationFailureStage = 'unknown',
): ClassifiedBrowserAutomationError {
  const message = getErrorText(error);
  const lower = message.toLowerCase();

  if (
    lower.includes('two-factor') ||
    lower.includes('2fa') ||
    lower.includes('totp') ||
    lower.includes('device approval') ||
    lower.includes('approval required') ||
    lower.includes('verify your identity')
  ) {
    return {
      code: 'needs_user_action',
      stage: 'auth',
      userFacing:
        'The site requires a user action such as 2FA or device approval.',
      needsReauth: true,
      blockedReason: 'Manual 2FA or device approval is required.',
    };
  }

  if (
    lower.includes('session expired') ||
    lower.includes('not logged in') ||
    lower.includes('not signed in') ||
    lower.includes('signed out') ||
    lower.includes('login required') ||
    lower.includes('log in required') ||
    lower.includes('sign in required') ||
    lower.includes('please log in') ||
    lower.includes('please login') ||
    lower.includes('401 unauthorized') ||
    lower.includes('http 401') ||
    lower.includes('unauthorized. please log in') ||
    lower.includes('unauthorized. please login')
  ) {
    return {
      code: 'needs_reauth',
      stage: 'auth',
      userFacing:
        'Authentication is no longer valid. Reconnect this browser profile.',
      needsReauth: true,
      blockedReason: 'Authentication expired or could not be verified.',
    };
  }

  if (lower.includes('captcha') || lower.includes('recaptcha')) {
    return {
      code: 'captcha_blocked',
      stage: 'auth',
      userFacing:
        'The site presented a captcha that automation cannot complete.',
      needsReauth: false,
      blockedReason: 'Captcha challenge blocked automation.',
    };
  }

  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('429')
  ) {
    return {
      code: 'rate_limited',
      stage,
      userFacing: 'The site or Browserbase rate limited this automation.',
      needsReauth: false,
    };
  }

  if (
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('deadline')
  ) {
    return {
      code: 'timeout',
      stage,
      userFacing: 'The browser automation timed out before it could finish.',
      needsReauth: false,
    };
  }

  if (
    lower.includes('no page') ||
    lower.includes('page closed') ||
    lower.includes('target closed') ||
    lower.includes('browser has been closed') ||
    lower.includes('session ended')
  ) {
    return {
      code: 'browser_session_lost',
      stage: 'session',
      userFacing: 'The browser session ended before the automation finished.',
      needsReauth: false,
    };
  }

  return {
    code: 'unknown',
    stage,
    userFacing: 'Browser automation failed for an unknown reason.',
    needsReauth: false,
  };
}

export function evaluationFailedError(
  message: string,
): ClassifiedBrowserAutomationError {
  return {
    code: 'evaluation_failed',
    stage: 'evaluation',
    userFacing: message,
    needsReauth: false,
  };
}
