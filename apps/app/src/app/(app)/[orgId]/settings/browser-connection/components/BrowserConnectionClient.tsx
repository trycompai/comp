'use client';

import { apiClient } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Spinner,
} from '@trycompai/design-system';
import { Globe, Screen } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useState } from 'react';
import {
  BrowserConnectionProfileList,
  type BrowserConnectionProfile,
} from './BrowserConnectionProfileList';
import { BrowserConnectionInstructions } from './BrowserConnectionInstructions';
import { BrowserConnectionLiveView } from './BrowserConnectionLiveView';

interface ResolveProfileResponse {
  profile: BrowserConnectionProfile & { contextId: string };
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

interface VerifyProfileResponse {
  profile: BrowserConnectionProfile;
  auth: AuthStatusResponse;
}

type Status = 'idle' | 'loading' | 'session-active' | 'checking';

interface BrowserConnectionClientProps {
  organizationId: string;
}

export function BrowserConnectionClient({ organizationId }: BrowserConnectionClientProps) {
  const { hasPermission } = usePermissions();
  const canManageBrowser = hasPermission('integration', 'create');
  const [status, setStatus] = useState<Status>('idle');
  const [hasContext, setHasContext] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<BrowserConnectionProfile[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [urlToCheck, setUrlToCheck] = useState('https://github.com');
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkContextStatus = useCallback(async () => {
    try {
      const res = await apiClient.get<BrowserConnectionProfile[]>('/v1/browserbase/profiles');
      if (res.data) {
        setProfiles(res.data);
        const verifiedProfile = res.data.find((profile) => profile.status === 'verified');
        const firstProfile = verifiedProfile ?? res.data[0];
        setHasContext(Boolean(verifiedProfile));
        setProfileId(firstProfile?.id ?? null);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    checkContextStatus();
  }, [checkContextStatus]);

  const handleStartSession = async () => {
    let startedSessionId: string | null = null;
    try {
      setError(null);
      setStatus('loading');

      const profileRes = await apiClient.post<ResolveProfileResponse>(
        '/v1/browserbase/profiles/resolve',
        { url: urlToCheck },
      );
      if (profileRes.error || !profileRes.data) {
        throw new Error(profileRes.error || 'Failed to create auth profile');
      }
      setProfileId(profileRes.data.profile.id);
      setProfiles((currentProfiles) => {
        const rest = currentProfiles.filter((profile) => profile.id !== profileRes.data?.profile.id);
        return profileRes.data ? [profileRes.data.profile, ...rest] : currentProfiles;
      });

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
        { sessionId: startedSessionId, url: urlToCheck },
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
          );
        } catch {
          // Ignore cleanup errors (don't mask original error)
        }
      }
    }
  };

  const handleCheckAuth = async () => {
    if (!sessionId || !profileId) return;

    try {
      setError(null);
      setStatus('checking');

      const res = await apiClient.post<VerifyProfileResponse>(
        `/v1/browserbase/profiles/${profileId}/verify`,
        { sessionId, url: urlToCheck },
      );
      if (res.error || !res.data) {
        throw new Error(res.error || 'Failed to check auth');
      }

      setAuthStatus(res.data.auth);
      setProfiles((currentProfiles) => {
        const rest = currentProfiles.filter((profile) => profile.id !== res.data?.profile.id);
        return res.data ? [res.data.profile, ...rest] : currentProfiles;
      });
      setHasContext(res.data.profile.status === 'verified');

      // Close the session after checking
      await apiClient.post('/v1/browserbase/session/close', { sessionId });
      setSessionId(null);
      setLiveViewUrl(null);
      setProfileId(null);
      setStatus('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check auth');
      setStatus('session-active');
    }
  };

  const handleCloseSession = async () => {
    if (sessionId) {
      try {
        await apiClient.post('/v1/browserbase/session/close', { sessionId });
      } catch {
        // Ignore
      }
    }
    setSessionId(null);
    setLiveViewUrl(null);
    setProfileId(null);
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
                <Screen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>Browser Session</CardTitle>
                <CardDescription>
                  {hasContext
                    ? 'At least one browser auth profile is verified'
                    : 'No verified browser auth profile yet'}
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
                  <div className="flex-1">
                    <Input
                      id="url"
                      placeholder="https://github.com"
                      value={urlToCheck}
                      onChange={(e) => setUrlToCheck(e.target.value)}
                    />
                  </div>
                  {canManageBrowser && (
                    <Button
                      onClick={handleStartSession}
                      disabled={!urlToCheck}
                      iconLeft={<Globe size={16} />}
                    >
                      {hasContext ? 'Open Browser' : 'Connect Browser'}
                    </Button>
                  )}
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
              <Spinner />
              Starting browser session...
            </div>
          )}
        </CardContent>
      </Card>

      {(status === 'session-active' || status === 'checking') && liveViewUrl && (
        <BrowserConnectionLiveView
          liveViewUrl={liveViewUrl}
          isChecking={status === 'checking'}
          canManageBrowser={canManageBrowser}
          onCheckAuth={handleCheckAuth}
          onClose={handleCloseSession}
        />
      )}

      <BrowserConnectionProfileList profiles={profiles} />
      <BrowserConnectionInstructions />
    </div>
  );
}
