'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { ResolveAuthProfileResponse } from './types';

/** Why an automated sign-in couldn't complete (mirrors the API result). */
export type AutoSignInFailure =
  | 'invalid_credentials'
  | 'needs_2fa'
  | 'challenge'
  | 'unknown';

export interface AutoSigninCredentials {
  username: string;
  password: string;
  totpSeed?: string;
  extraFields?: { label: string; value: string }[];
}

export interface AutoSigninHandle {
  runId: string;
  publicAccessToken: string;
  profileId: string;
  /** Session the sign-in runs on — shown as a live view to watch / take over. */
  sessionId: string;
  liveViewUrl: string;
}

/**
 * Password path of the connect flow: resolve the profile, store the login, then
 * kick off the automated first sign-in as a background Trigger.dev run. Returns
 * a handle to subscribe to (plus the profileId, so a fallback live sign-in can
 * target the same profile). Returns null on failure.
 */
export function useAutoSignin() {
  const [isStarting, setIsStarting] = useState(false);

  const startSignin = useCallback(
    async ({
      url,
      credentials,
      mode = 'password',
      usernameLabel,
    }: {
      url: string;
      /** Omitted for SSO — there are no credentials to store. */
      credentials?: AutoSigninCredentials;
      mode?: 'password' | 'sso';
      /** Vendor's identifier-field label (e.g. "IAM username") for a truthful step. */
      usernameLabel?: string;
    }): Promise<AutoSigninHandle | null> => {
      setIsStarting(true);
      try {
        const profileRes = await apiClient.post<ResolveAuthProfileResponse>(
          '/v1/browserbase/profiles/resolve',
          { url },
        );
        const profileId = profileRes.data?.profile?.id;
        if (profileRes.error || !profileId) {
          toast.error(profileRes.error || 'Could not prepare the connection.');
          return null;
        }

        // Password mode stores the login for unattended replay; SSO has nothing
        // to store — the user finishes at their identity provider.
        if (credentials) {
          const credRes = await apiClient.post(
            `/v1/browserbase/profiles/${profileId}/credentials`,
            {
              username: credentials.username,
              password: credentials.password,
              totpSeed: credentials.totpSeed?.trim() || undefined,
              extraFields: credentials.extraFields?.length
                ? credentials.extraFields
                : undefined,
              // Persist the detected identifier label so reconnects show it too.
              usernameLabel: usernameLabel?.trim() || undefined,
            },
          );
          if (credRes.error) {
            // 503 = automatic sign-in isn't provisioned on this environment (no
            // credential vault). That's not an error the user caused — let the
            // caller fall back to a manual sign-in with a calmer message.
            if (credRes.status === 503) {
              toast.info(
                "Automatic sign-in isn't set up on this environment — you can sign in manually instead.",
              );
            } else {
              toast.error(credRes.error || 'Could not store the login.');
            }
            return null;
          }
        }

        const signinRes = await apiClient.post<{
          runId: string;
          publicAccessToken: string;
          sessionId: string;
          liveViewUrl: string;
        }>(`/v1/browserbase/profiles/${profileId}/sign-in`, { url, mode, usernameLabel });
        if (signinRes.error || !signinRes.data?.runId) {
          toast.error(signinRes.error || 'Could not start the sign-in.');
          return null;
        }

        return {
          runId: signinRes.data.runId,
          publicAccessToken: signinRes.data.publicAccessToken,
          profileId,
          sessionId: signinRes.data.sessionId,
          liveViewUrl: signinRes.data.liveViewUrl,
        };
      } catch {
        return null;
      } finally {
        setIsStarting(false);
      }
    },
    [],
  );

  return { startSignin, isStarting };
}
