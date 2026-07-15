'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { ResolveAuthProfileResponse } from './types';

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
    }: {
      url: string;
      credentials: AutoSigninCredentials;
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

        const credRes = await apiClient.post(
          `/v1/browserbase/profiles/${profileId}/credentials`,
          {
            username: credentials.username,
            password: credentials.password,
            totpSeed: credentials.totpSeed?.trim() || undefined,
            extraFields: credentials.extraFields?.length
              ? credentials.extraFields
              : undefined,
          },
        );
        if (credRes.error) {
          toast.error(credRes.error || 'Could not store the login.');
          return null;
        }

        const signinRes = await apiClient.post<{
          runId: string;
          publicAccessToken: string;
        }>(`/v1/browserbase/profiles/${profileId}/sign-in`, { url });
        if (signinRes.error || !signinRes.data?.runId) {
          toast.error(signinRes.error || 'Could not start the sign-in.');
          return null;
        }

        return {
          runId: signinRes.data.runId,
          publicAccessToken: signinRes.data.publicAccessToken,
          profileId,
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
