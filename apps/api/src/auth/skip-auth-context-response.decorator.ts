import { SetMetadata } from '@nestjs/common';

export const SKIP_AUTH_CONTEXT_RESPONSE_KEY = 'skipAuthContextResponse';

/**
 * Opt an endpoint out of having `authType` / `authenticatedUser` appended to
 * its response body.
 *
 * Use it where echoing who called is wrong or unhelpful:
 * - public and webhook endpoints, where there is no caller identity to report
 * - trust-portal and other externally consumed payloads, where leaking an
 *   internal user id/email would be a disclosure
 * - endpoints whose response shape is fixed by an external contract
 */
export const SkipAuthContextResponse = () =>
  SetMetadata(SKIP_AUTH_CONTEXT_RESPONSE_KEY, true);
