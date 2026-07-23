'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import { Button, Input, Spinner } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BrowserConnectionLiveView } from './BrowserConnectionLiveView';
import { summarize, type Connection } from './connection-format';
import { ConnectionsTable } from './ConnectionsTable';
import { ManageConnectionSheet } from './ManageConnectionSheet';

interface ResolveResponse {
  profile: Connection & { contextId: string };
  isNew: boolean;
}
interface SessionResponse {
  sessionId: string;
  liveViewUrl: string;
}

interface BrowserConnectionClientProps {
  organizationId: string;
  initialProfiles?: Connection[];
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Org-level browser connections manager (design 2a, dense table). Lists every
 * vendor login the org has, with health, and wires the existing profile API for
 * connect / reconnect / rename / change-login / remove.
 */
export function BrowserConnectionClient({
  organizationId: _organizationId,
  initialProfiles = [],
}: BrowserConnectionClientProps) {
  const { hasPermission } = usePermissions();
  const canConnect = hasPermission('integration', 'create');
  const canUpdate = hasPermission('integration', 'update');
  const canDelete = hasPermission('integration', 'delete');

  const [profiles, setProfiles] = useState<Connection[]>(initialProfiles);
  const [mode, setMode] = useState<'list' | 'session'>('list');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);

  const [connectOpen, setConnectOpen] = useState(false);
  const [connectUrl, setConnectUrl] = useState('');

  const [manageConnection, setManageConnection] = useState<Connection | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  const fetchProfiles = useCallback(async () => {
    const res = await apiClient.get<Connection[]>('/v1/browserbase/profiles');
    setProfiles(Array.isArray(res.data) ? res.data : []);
  }, []);

  useEffect(() => {
    void fetchProfiles();
  }, [fetchProfiles]);

  const openSession = useCallback(async (profileId: string, url: string) => {
    const sessionRes = await apiClient.post<SessionResponse>(
      `/v1/browserbase/profiles/${profileId}/session`,
      {},
    );
    if (sessionRes.error || !sessionRes.data) {
      throw new Error(sessionRes.error || 'Could not open a browser session.');
    }
    setSessionId(sessionRes.data.sessionId);
    setLiveViewUrl(sessionRes.data.liveViewUrl);
    setActiveProfileId(profileId);
    setActiveUrl(url);
    await apiClient.post('/v1/browserbase/navigate', {
      sessionId: sessionRes.data.sessionId,
      url,
    });
    setMode('session');
  }, []);

  const handleConnect = useCallback(async () => {
    const url = normalizeUrl(connectUrl);
    if (!url) return;
    setStarting(true);
    try {
      const resolveRes = await apiClient.post<ResolveResponse>(
        '/v1/browserbase/profiles/resolve',
        { url },
      );
      if (resolveRes.error || !resolveRes.data) {
        throw new Error(resolveRes.error || 'Could not start the connection.');
      }
      await openSession(resolveRes.data.profile.id, url);
      setConnectOpen(false);
      setConnectUrl('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start the connection.');
    } finally {
      setStarting(false);
    }
  }, [connectUrl, openSession]);

  const handleReconnect = useCallback(
    async (connection: Connection) => {
      setManageOpen(false);
      setStarting(true);
      try {
        await openSession(
          connection.id,
          connection.lastAuthCheckUrl || `https://${connection.hostname}`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not reconnect.');
      } finally {
        setStarting(false);
      }
    },
    [openSession],
  );

  const handleVerify = useCallback(async () => {
    if (!sessionId || !activeProfileId) return;
    setIsVerifying(true);
    try {
      await apiClient.post(`/v1/browserbase/profiles/${activeProfileId}/verify`, {
        sessionId,
        url: activeUrl,
      });
      await apiClient.post('/v1/browserbase/session/close', { sessionId });
      await fetchProfiles();
      setMode('list');
      setSessionId(null);
      setLiveViewUrl(null);
      setActiveProfileId(null);
      toast.success('Connection saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not verify the session.');
    } finally {
      setIsVerifying(false);
    }
  }, [sessionId, activeProfileId, activeUrl, fetchProfiles]);

  const handleCloseSession = useCallback(async () => {
    if (sessionId) {
      try {
        await apiClient.post('/v1/browserbase/session/close', { sessionId });
      } catch {
        // ignore — closing best-effort
      }
    }
    setMode('list');
    setSessionId(null);
    setLiveViewUrl(null);
    setActiveProfileId(null);
  }, [sessionId]);

  const handleManage = useCallback((connection: Connection) => {
    setManageConnection(connection);
    setManageOpen(true);
  }, []);

  const handleRename = useCallback(
    async (connection: Connection, name: string) => {
      setBusy(true);
      try {
        await apiClient.patch(`/v1/browserbase/profiles/${connection.id}`, {
          displayName: name,
        });
        await fetchProfiles();
        setManageOpen(false);
        toast.success('Connection renamed.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not rename.');
      } finally {
        setBusy(false);
      }
    },
    [fetchProfiles],
  );

  const handleChangeLogin = useCallback(
    async (connection: Connection, creds: { username: string; password: string }) => {
      setBusy(true);
      try {
        await apiClient.post(`/v1/browserbase/profiles/${connection.id}/credentials`, creds);
        await fetchProfiles();
        setManageOpen(false);
        toast.success('Login updated. Reconnect to verify it works.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not update the login.');
      } finally {
        setBusy(false);
      }
    },
    [fetchProfiles],
  );

  const handleRemove = useCallback(
    async (connection: Connection) => {
      setBusy(true);
      try {
        await apiClient.delete(`/v1/browserbase/profiles/${connection.id}`);
        await fetchProfiles();
        setManageOpen(false);
        toast.success('Connection removed.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not remove.');
      } finally {
        setBusy(false);
      }
    },
    [fetchProfiles],
  );

  if (mode === 'session' && liveViewUrl) {
    return (
      <BrowserConnectionLiveView
        liveViewUrl={liveViewUrl}
        isChecking={isVerifying}
        canManageBrowser={canUpdate || canConnect}
        onCheckAuth={handleVerify}
        onClose={handleCloseSession}
      />
    );
  }

  const summary = summarize(profiles);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[13px] text-muted-foreground">
          Vendor logins Comp uses to sign in and capture evidence on a schedule.
          {profiles.length > 0 && (
            <span className="ml-2 text-foreground">
              {summary.total} {summary.total === 1 ? 'connection' : 'connections'}
              {' · '}
              <span style={{ color: 'var(--success)' }}>{summary.active} active</span>
              {summary.needAttention > 0 && (
                <>
                  {' · '}
                  <span style={{ color: 'oklch(0.5 0.14 85)' }}>
                    {summary.needAttention} need attention
                  </span>
                </>
              )}
            </span>
          )}
        </div>
        {canConnect && !connectOpen && (
          <div>
            <Button
              onClick={() => setConnectOpen(true)}
              iconLeft={<Add size={14} />}
              disabled={starting}
            >
              Connect a vendor
            </Button>
          </div>
        )}
      </div>

      {connectOpen && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <label htmlFor="connect-url" className="text-[13px] font-medium text-foreground">
            Vendor sign-in URL
          </label>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-[220px] flex-1">
              <Input
                id="connect-url"
                value={connectUrl}
                onChange={(event) => setConnectUrl(event.target.value)}
                placeholder="https://github.com/login"
              />
            </div>
            <Button onClick={handleConnect} loading={starting} disabled={!connectUrl.trim() || starting}>
              Open browser
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setConnectOpen(false);
                setConnectUrl('');
              }}
            >
              Cancel
            </Button>
          </div>
          <p className="text-[12px] text-muted-foreground">
            A live browser opens — sign in once, then Comp saves the session and re-logs
            in automatically.
          </p>
        </div>
      )}

      {starting && !connectOpen && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Opening browser…
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-dashed border-border py-16 text-center">
          <div className="max-w-[320px]">
            <div className="text-sm text-foreground">No connections yet</div>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Connect a vendor login so Comp can sign in and capture evidence for your
              browser automations.
            </p>
          </div>
        </div>
      ) : (
        <ConnectionsTable
          connections={profiles}
          canManage={canUpdate}
          onReconnect={handleReconnect}
          onManage={handleManage}
        />
      )}

      <ManageConnectionSheet
        connection={manageConnection}
        open={manageOpen}
        onOpenChange={setManageOpen}
        canManage={canUpdate}
        canRemove={canDelete}
        busy={busy}
        onReconnect={handleReconnect}
        onRename={handleRename}
        onChangeLogin={handleChangeLogin}
        onRemove={handleRemove}
      />
    </div>
  );
}
