'use client';

import { apiClient } from '@/lib/api-client';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface SigninLiveView {
  sessionId: string;
  liveViewUrl: string;
  profileId: string;
}

/**
 * Manages the Browserbase session behind the automated sign-in: the live view
 * the user watches, closing it (keepAlive sessions don't self-close), and
 * verifying a hand-off the user finished themselves.
 */
export function useSigninSession() {
  const [signinLiveView, setSigninLiveView] = useState<SigninLiveView | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const closeSession = useCallback((sessionId: string) => {
    void apiClient.post('/v1/browserbase/session/close', { sessionId });
  }, []);

  const endSession = useCallback(() => {
    setSigninLiveView((current) => {
      if (current) closeSession(current.sessionId);
      return null;
    });
  }, [closeSession]);

  // After the user finishes a handed-over sign-in, confirm it's authenticated.
  // Returns true and cleans up on success; toasts and returns false otherwise.
  const verify = useCallback(
    async (url: string): Promise<boolean> => {
      if (!signinLiveView) return false;
      setIsVerifying(true);
      try {
        const res = await apiClient.post<{ auth: { isLoggedIn: boolean } }>(
          `/v1/browserbase/profiles/${signinLiveView.profileId}/verify`,
          { sessionId: signinLiveView.sessionId, url },
        );
        if (res.error || !res.data) {
          toast.error(res.error || 'Could not verify the sign-in.');
          return false;
        }
        if (res.data.auth.isLoggedIn) {
          closeSession(signinLiveView.sessionId);
          setSigninLiveView(null);
          return true;
        }
        toast.error('Still not signed in — finish in the browser, then try again.');
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [signinLiveView, closeSession],
  );

  return { signinLiveView, setSigninLiveView, endSession, isVerifying, verify };
}
