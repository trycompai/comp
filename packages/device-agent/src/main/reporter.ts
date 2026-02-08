import { API_ROUTES } from '../shared/constants';
import type { CheckInRequest, CheckInResponse, CheckResult } from '../shared/types';
import { log } from './logger';
import { getAuth, getPortalUrl } from './store';

export interface ReportResult {
  allSucceeded: boolean;
  isCompliant: boolean;
  /** True if ANY org returned 401 — session has expired */
  sessionExpired: boolean;
}

/**
 * Sends compliance check results to the portal API for ALL registered organizations.
 * The same check results are reported to each org's device record.
 */
export async function reportCheckResults(checks: CheckResult[]): Promise<ReportResult> {
  const auth = getAuth();
  if (!auth) {
    log('Cannot report check results: not authenticated', 'ERROR');
    return { allSucceeded: false, isCompliant: false, sessionExpired: false };
  }

  const portalUrl = getPortalUrl();
  const cookieHeader = `better-auth.session_token=${auth.sessionToken}`;

  let allSucceeded = true;
  let anyNonCompliant = false;
  let sessionExpired = false;

  for (const org of auth.organizations) {
    const payload: CheckInRequest = {
      deviceId: org.deviceId,
      checks,
    };

    try {
      const response = await fetch(`${portalUrl}${API_ROUTES.CHECK_IN}`, {
        method: 'POST',
        headers: {
          Cookie: cookieHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log(
          `Check-in failed for ${org.organizationName} (${response.status}): ${errorText}`,
          'ERROR',
        );
        allSucceeded = false;

        if (response.status === 401) {
          log('Session expired — user needs to re-authenticate', 'ERROR');
          sessionExpired = true;
          break; // No point trying other orgs with the same expired token
        }
        continue;
      }

      const result: CheckInResponse = await response.json();
      log(
        `Check-in for ${org.organizationName}: ${result.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`,
      );

      if (!result.isCompliant) {
        anyNonCompliant = true;
      }
    } catch (error) {
      log(`Failed to report to ${org.organizationName}: ${error}`, 'ERROR');
      allSucceeded = false;
    }
  }

  return {
    allSucceeded,
    isCompliant: !anyNonCompliant && allSucceeded,
    sessionExpired,
  };
}
