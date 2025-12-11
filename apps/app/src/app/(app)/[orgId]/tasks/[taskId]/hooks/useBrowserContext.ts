'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type {
  AuthStatusResponse,
  BrowserContextStatus,
  ContextResponse,
  SessionResponse,
} from './types';

interface UseBrowserContextOptions {
  organizationId: string;
}

export function useBrowserContext({ organizationId }: UseBrowserContextOptions) {
  const [status, setStatus] = useState<BrowserContextStatus>('loading');
  const [contextId, setContextId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [isStartingAuth, setIsStartingAuth] = useState(false);
  const [showAuthFlow, setShowAuthFlow] = useState(false);

  const checkContextStatus = useCallback(async () => {
    try {
      const res = await apiClient.get<{ hasContext: boolean; contextId?: string }>(
        '/v1/browserbase/org-context',
        organizationId,
      );
      if (res.data) {
        if (res.data.hasContext && res.data.contextId) {
          setContextId(res.data.contextId);
          setStatus('has-context');
        } else {
          setStatus('no-context');
        }
      }
    } catch {
      setStatus('no-context');
    }
  }, [organizationId]);

  const startAuth = useCallback(
    async (url: string) => {
      try {
        setIsStartingAuth(true);

        // Get or create org context
        const contextRes = await apiClient.post<ContextResponse>(
          '/v1/browserbase/org-context',
          {},
          organizationId,
        );
        if (contextRes.error || !contextRes.data) {
          throw new Error(contextRes.error || 'Failed to create context');
        }
        setContextId(contextRes.data.contextId);

        // Create session
        const sessionRes = await apiClient.post<SessionResponse>(
          '/v1/browserbase/session',
          { contextId: contextRes.data.contextId },
          organizationId,
        );
        if (sessionRes.error || !sessionRes.data) {
          throw new Error(sessionRes.error || 'Failed to create session');
        }
        setSessionId(sessionRes.data.sessionId);
        setLiveViewUrl(sessionRes.data.liveViewUrl);

        // Navigate to the URL
        await apiClient.post(
          '/v1/browserbase/navigate',
          { sessionId: sessionRes.data.sessionId, url },
          organizationId,
        );

        setShowAuthFlow(true);
        setIsStartingAuth(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to start authentication');
        setIsStartingAuth(false);
      }
    },
    [organizationId],
  );

  const checkAuth = useCallback(
    async (url: string) => {
      if (!sessionId) return;

      try {
        setStatus('checking');

        const res = await apiClient.post<AuthStatusResponse>(
          '/v1/browserbase/check-auth',
          { sessionId, url },
          organizationId,
        );

        // Close session
        await apiClient.post('/v1/browserbase/session/close', { sessionId }, organizationId);
        setSessionId(null);
        setLiveViewUrl(null);
        setShowAuthFlow(false);

        if (res.data?.isLoggedIn) {
          toast.success(
            res.data.username ? `Authenticated as ${res.data.username}` : 'Authentication saved',
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
    [sessionId, organizationId],
  );

  const cancelAuth = useCallback(async () => {
    if (sessionId) {
      try {
        await apiClient.post('/v1/browserbase/session/close', { sessionId }, organizationId);
      } catch {
        // Ignore
      }
    }
    setSessionId(null);
    setLiveViewUrl(null);
    setShowAuthFlow(false);
    setStatus(contextId ? 'has-context' : 'no-context');
  }, [sessionId, contextId, organizationId]);

  return {
    status,
    contextId,
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
