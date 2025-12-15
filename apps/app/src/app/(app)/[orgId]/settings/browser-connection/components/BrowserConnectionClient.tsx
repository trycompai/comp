'use client';

import { apiClient } from '@/lib/api-client';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { Globe, Loader2, MonitorSmartphone, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface ContextResponse {
  contextId: string;
  isNew: boolean;
}

interface SessionResponse {
  sessionId: string;
  liveViewUrl: string;
}

interface AuthStatusResponse {
  isLoggedIn: boolean;
  username?: string;
}

type Status = 'idle' | 'loading' | 'session-active' | 'checking';

interface BrowserConnectionClientProps {
  organizationId: string;
}

export function BrowserConnectionClient({ organizationId }: BrowserConnectionClientProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [hasContext, setHasContext] = useState(false);
  const [contextId, setContextId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [urlToCheck, setUrlToCheck] = useState('https://github.com');
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if org has a browser context
  const checkContextStatus = useCallback(async () => {
    try {
      const res = await apiClient.get<{ hasContext: boolean; contextId?: string }>(
        '/v1/browserbase/org-context',
        organizationId,
      );
      if (res.data) {
        setHasContext(res.data.hasContext);
        setContextId(res.data.contextId || null);
      }
    } catch {
      // Ignore
    }
  }, [organizationId]);

  useEffect(() => {
    checkContextStatus();
  }, [checkContextStatus]);

  const handleStartSession = async () => {
    let startedSessionId: string | null = null;
    try {
      setError(null);
      setStatus('loading');

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
      setHasContext(true);

      // Create session
      const sessionRes = await apiClient.post<SessionResponse>(
        '/v1/browserbase/session',
        { contextId: contextRes.data.contextId },
        organizationId,
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
        { sessionId: startedSessionId, url: urlToCheck },
        organizationId,
      );

      setStatus('session-active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
      setSessionId(null);
      setLiveViewUrl(null);
      setStatus('idle');

      // If we created a session but navigation failed, close it to avoid orphaned sessions
      if (startedSessionId) {
        try {
          await apiClient.post(
            '/v1/browserbase/session/close',
            { sessionId: startedSessionId },
            organizationId,
          );
        } catch {
          // Ignore cleanup errors (don't mask original error)
        }
      }
    }
  };

  const handleCheckAuth = async () => {
    if (!sessionId) return;

    try {
      setError(null);
      setStatus('checking');

      const res = await apiClient.post<AuthStatusResponse>(
        '/v1/browserbase/check-auth',
        { sessionId, url: urlToCheck },
        organizationId,
      );
      if (res.error || !res.data) {
        throw new Error(res.error || 'Failed to check auth');
      }

      setAuthStatus(res.data);

      // Close the session after checking
      await apiClient.post('/v1/browserbase/session/close', { sessionId }, organizationId);
      setSessionId(null);
      setLiveViewUrl(null);
      setStatus('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check auth');
      setStatus('session-active');
    }
  };

  const handleCloseSession = async () => {
    if (sessionId) {
      try {
        await apiClient.post('/v1/browserbase/session/close', { sessionId }, organizationId);
      } catch {
        // Ignore
      }
    }
    setSessionId(null);
    setLiveViewUrl(null);
    setStatus('idle');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <MonitorSmartphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Browser Session</CardTitle>
                <CardDescription>
                  {hasContext
                    ? 'Your organization has a browser context configured'
                    : 'No browser context configured yet'}
                </CardDescription>
              </div>
            </div>
            <Badge variant={hasContext ? 'default' : 'secondary'}>
              {hasContext ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

          {status === 'idle' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="url">Website URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    placeholder="https://github.com"
                    value={urlToCheck}
                    onChange={(e) => setUrlToCheck(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleStartSession} disabled={!urlToCheck}>
                    <Globe className="mr-2 h-4 w-4" />
                    {hasContext ? 'Open Browser' : 'Connect Browser'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Open a browser session to authenticate with websites. Your login session will be
                  saved and used for browser automations.
                </p>
              </div>

              {authStatus && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        authStatus.isLoggedIn ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                    />
                    <span className="text-sm font-medium">
                      {authStatus.isLoggedIn
                        ? `Logged in${authStatus.username ? ` as ${authStatus.username}` : ''}`
                        : 'Not logged in'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {status === 'loading' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting browser session...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live View */}
      {(status === 'session-active' || status === 'checking') && liveViewUrl && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Browser Session</CardTitle>
                <CardDescription>
                  Log in to websites below. Your session will be saved for automations.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckAuth}
                  disabled={status === 'checking'}
                >
                  {status === 'checking' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Check & Save
                    </>
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCloseSession}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <iframe
                src={liveViewUrl}
                className="h-[600px] w-full"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Create a service account</strong> - We recommend
              creating a dedicated account (e.g., &quot;comp-automation@yourcompany.com&quot;) for
              browser automations.
            </li>
            <li>
              <strong className="text-foreground">Authenticate once</strong> - Open the browser
              above and log in to the websites you want to automate (GitHub, Jira, etc.).
            </li>
            <li>
              <strong className="text-foreground">Session is shared</strong> - All browser
              automations in your organization will use this authenticated session.
            </li>
            <li>
              <strong className="text-foreground">Re-authenticate when needed</strong> - If a
              session expires, come back here to log in again.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
