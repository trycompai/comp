'use client';

// Reuse the task flow's proven connect/reconnect experience here so org-level
// connections use the same reliable path (method detection + automated
// credential entry + a working live takeover) instead of a bespoke, flaky one.
import { ConnectVendorLoginFlow } from '@/app/(app)/[orgId]/tasks/[taskId]/components/browser-automations/ConnectVendorLoginFlow';
import { clearConnectState } from '@/app/(app)/[orgId]/tasks/[taskId]/components/browser-automations/connect-flow-storage';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import { Button } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { methodOf, summarize, type Connection } from './connection-format';
import { ConnectionsTable } from './ConnectionsTable';
import { ManageConnectionSheet } from './ManageConnectionSheet';

interface BrowserConnectionClientProps {
  organizationId: string;
  initialProfiles?: Connection[];
}

/** The connect/reconnect flow the page is currently showing (full-screen). */
type ActiveFlow = { kind: 'connect' } | { kind: 'reconnect'; connection: Connection };

// Stable resume-state key for the shared connect flow on this page. Cleared each
// time the flow opens so "Connect a vendor" always starts fresh (a settings page
// has no "resume where I left off" — that would trap the user on a stale step).
const CONNECT_FLOW_KEY = 'org-connections';

/**
 * Org-level browser connections manager. Lists every vendor login the org has,
 * with health, and wires the shared connect flow for connect / reconnect plus
 * the profile API for rename / change-login / remove.
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
  const [flow, setFlow] = useState<ActiveFlow | null>(null);
  const [busy, setBusy] = useState(false);

  const [manageConnection, setManageConnection] = useState<Connection | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  const fetchProfiles = useCallback(async () => {
    const res = await apiClient.get<Connection[]>('/v1/browserbase/profiles');
    setProfiles(Array.isArray(res.data) ? res.data : []);
  }, []);

  useEffect(() => {
    void fetchProfiles();
  }, [fetchProfiles]);

  // After the shared flow connects or reconnects, refresh the list and return.
  const handleFlowDone = useCallback(
    (message: string) => {
      void fetchProfiles();
      setFlow(null);
      toast.success(message);
    },
    [fetchProfiles],
  );

  // Always start the shared flow from a clean slate on this page.
  const openConnect = useCallback(() => {
    clearConnectState(CONNECT_FLOW_KEY);
    setFlow({ kind: 'connect' });
  }, []);

  const handleReconnect = useCallback((connection: Connection) => {
    setManageOpen(false);
    clearConnectState(CONNECT_FLOW_KEY);
    setFlow({ kind: 'reconnect', connection });
  }, []);

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

  const handleSetTotp = useCallback(async (connection: Connection, totpSeed: string) => {
    setBusy(true);
    try {
      await apiClient.post(`/v1/browserbase/profiles/${connection.id}/totp`, { totpSeed });
      toast.success('Automatic 2FA is on. Scheduled runs generate the code for you.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the authenticator key.');
    } finally {
      setBusy(false);
    }
  }, []);

  const handleClearTotp = useCallback(async (connection: Connection) => {
    setBusy(true);
    try {
      await apiClient.delete(`/v1/browserbase/profiles/${connection.id}/totp`);
      toast.success('Automatic 2FA turned off.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not turn off automatic 2FA.');
    } finally {
      setBusy(false);
    }
  }, []);

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

  // Connect / reconnect take over the whole panel via the shared flow — the same
  // one the evidence task uses, so behaviour is identical and reliable.
  if (flow) {
    const reconnect =
      flow.kind === 'reconnect'
        ? {
            url: flow.connection.lastAuthCheckUrl || `https://${flow.connection.hostname}`,
            mode: methodOf(flow.connection),
          }
        : undefined;
    return (
      <ConnectVendorLoginFlow
        // Stable key (not a real task) so the flow's resume state is scoped to
        // this page and never collides with a task's in-flight connect.
        taskId={CONNECT_FLOW_KEY}
        reconnect={reconnect}
        onConnected={() => handleFlowDone('Connection added.')}
        onReconnected={() => handleFlowDone('Connection reconnected.')}
        onCancel={() => setFlow(null)}
      />
    );
  }

  const summary = summarize(profiles);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[13px] text-muted-foreground">
          Vendor logins Comp AI uses to sign in and capture evidence on a schedule.
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
        {canConnect && (
          <div>
            <Button onClick={openConnect} iconLeft={<Add size={14} />}>
              Connect a vendor
            </Button>
          </div>
        )}
      </div>

      {profiles.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-dashed border-border py-16 text-center">
          <div className="max-w-[320px]">
            <div className="text-sm text-foreground">No connections yet</div>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Connect a vendor login so Comp AI can sign in and capture evidence for your
              browser automations.
            </p>
            {canConnect && (
              <div className="mt-4">
                <Button onClick={openConnect} iconLeft={<Add size={14} />}>
                  Connect a vendor
                </Button>
              </div>
            )}
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
        onSetTotp={handleSetTotp}
        onClearTotp={handleClearTotp}
        onRemove={handleRemove}
      />
    </div>
  );
}
