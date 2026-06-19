'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type {
  AuthStatusResponse,
  BrowserAuthProfile,
  BrowserContextStatus,
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
        const firstProfile = verifiedProfile ?? res.data[0];
        if (firstProfile) {
          setContextId(firstProfile.contextId);
          setProfileId(firstProfile.id);
          setStatus('has-context');
        } else {
          setStatus('no-context');
        }
      }
    } catch {
      setStatus('no-context');
    }
  }, []);

  const startAuth = useCallback(
    async (url: string) => {
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
        setContextId(profileRes.data.profile.contextId);
        setProfileId(profileRes.data.profile.id);

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

        // Navigate to the URL
        await apiClient.post(
          '/v1/browserbase/navigate',
          { sessionId: startedSessionId, url },
        );

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
            await apiClient.post(
              '/v1/browserbase/session/close',
              { sessionId: startedSessionId },
            );
          } catch {
            // Ignore cleanup errors (don't mask original error)
          }
        }
      }
    },
    [],
  );

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

        // Close session
        await apiClient.post('/v1/browserbase/session/close', { sessionId });
        setSessionId(null);
        setLiveViewUrl(null);
        setShowAuthFlow(false);

        if (res.data?.auth.isLoggedIn) {
          toast.success(
            res.data.auth.username
              ? `Authenticated as ${res.data.auth.username}`
              : 'Authentication saved',
          );
          setStatus('has-context');
        } else {
          toast.error('Not logged in. Please try again.');
          setStatus('has-context');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to check auth');
        setStatus('has-context');
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
