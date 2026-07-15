'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type {
  AuthStatusResponse,
  BrowserAuthProfile,
  BrowserContextStatus,
  BrowserLoginCredentials,
  NavigateResponse,
  ResolveAuthProfileResponse,
  SessionResponse,
} from './types';

export function useBrowserContext() {
  const [status, setStatus] = useState<BrowserContextStatus>('loading');
  const [contextId, setContextId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [isStartingAuth, setIsStartingAuth] = useState(false);
  const [showAuthFlow, setShowAuthFlow] = useState(false);

  const checkContextStatus = useCallback(async () => {
    try {
      const res = await apiClient.get<BrowserAuthProfile[]>('/v1/browserbase/profiles');
      if (res.data) {
        const verifiedProfile = res.data.find((profile) => profile.status === 'verified');
        if (verifiedProfile) {
          setContextId(verifiedProfile.contextId);
          setProfileId(verifiedProfile.id);
          setStatus('has-context');
        } else {
          setContextId(null);
          setProfileId(null);
          setStatus('no-context');
        }
      } else {
        setContextId(null);
        setProfileId(null);
        setStatus('no-context');
      }
    } catch {
      setStatus('no-context');
    }
  }, []);

  const startAuth = useCallback(async (url: string, credentials?: BrowserLoginCredentials) => {
    let startedSessionId: string | null = null;
    try {
      setIsStartingAuth(true);

      const profileRes = await apiClient.post<ResolveAuthProfileResponse>(
        '/v1/browserbase/profiles/resolve',
        { url },
      );
      if (profileRes.error || !profileRes.data) {
        throw new Error(profileRes.error || 'Failed to create auth profile');
      }
      setProfileId(profileRes.data.profile.id);

      // Store the login so scheduled and manual runs can sign in on their own.
      // Failure here is non-fatal — the user can still connect manually below.
      if (credentials?.username && credentials?.password) {
        const credRes = await apiClient.post(
          `/v1/browserbase/profiles/${profileRes.data.profile.id}/credentials`,
          {
            username: credentials.username,
            password: credentials.password,
            totpSeed: credentials.totpSeed?.trim() || undefined,
          },
        );
        if (credRes.error) {
          toast.warning(
            "Saved the site, but couldn't store the login for automatic sign-in. You can still connect manually.",
          );
        }
      }

      const sessionRes = await apiClient.post<SessionResponse>(
        `/v1/browserbase/profiles/${profileRes.data.profile.id}/session`,
        {},
      );
      if (sessionRes.error || !sessionRes.data) {
        throw new Error(sessionRes.error || 'Failed to create session');
      }
      startedSessionId = sessionRes.data.sessionId;
      setSessionId(startedSessionId);
      setLiveViewUrl(sessionRes.data.liveViewUrl);

      const navigateRes = await apiClient.post<NavigateResponse>('/v1/browserbase/navigate', {
        sessionId: startedSessionId,
        url,
      });
      if (navigateRes.error || !navigateRes.data?.success) {
        throw new Error(
          navigateRes.error ||
            navigateRes.data?.error ||
            'Failed to open the website in the browser session',
        );
      }

      setShowAuthFlow(true);
      setIsStartingAuth(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start authentication');
      setShowAuthFlow(false);
      setLiveViewUrl(null);
      setSessionId(null);
      setIsStartingAuth(false);

      // If we created a session but navigation failed, close it to avoid orphaned sessions
      if (startedSessionId) {
        try {
          await apiClient.post('/v1/browserbase/session/close', { sessionId: startedSessionId });
        } catch {
          // Ignore cleanup errors (don't mask original error)
        }
      }
    }
  }, []);

  const checkAuth = useCallback(
    async (url: string) => {
      if (!sessionId) return;

      try {
        setStatus('checking');

        if (!profileId) throw new Error('No auth profile selected');

        const res = await apiClient.post<{
          auth: AuthStatusResponse;
          profile: BrowserAuthProfile;
        }>(`/v1/browserbase/profiles/${profileId}/verify`, { sessionId, url });

        if (res.error || !res.data) {
          throw new Error(res.error || 'Failed to check authentication');
        }

        if (res.data.auth.isLoggedIn) {
          try {
            await apiClient.post('/v1/browserbase/session/close', { sessionId });
          } catch {
            // Ignore cleanup errors after auth was already verified
          }
          setSessionId(null);
          setLiveViewUrl(null);
          setShowAuthFlow(false);
          toast.success(
            res.data.auth.username
              ? `Authenticated as ${res.data.auth.username}`
              : 'Authentication saved',
          );
          setContextId(res.data.profile.contextId);
          setProfileId(res.data.profile.id);
          setStatus('has-context');
        } else {
          toast.error('Still not logged in. Finish login, then click Check & Save again.');
          setStatus('no-context');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to check auth');
        setStatus('no-context');
      }
    },
    [sessionId, profileId],
  );

  const cancelAuth = useCallback(async () => {
    if (sessionId) {
      try {
        await apiClient.post('/v1/browserbase/session/close', { sessionId });
      } catch {
        // Ignore
      }
    }
    setSessionId(null);
    setLiveViewUrl(null);
    setShowAuthFlow(false);
    setStatus(contextId ? 'has-context' : 'no-context');
  }, [sessionId, contextId]);

  return {
    status,
    contextId,
    profileId,
    sessionId,
    liveViewUrl,
    isStartingAuth,
    showAuthFlow,
    checkContextStatus,
    startAuth,
    checkAuth,
    cancelAuth,
  };
}
