'use client';

// Reuse the task flow's proven connect/reconnect experience here so org-level
// connections use the same reliable path (method detection + automated
// credential entry + a working live takeover) instead of a bespoke, flaky one.
import { ConnectVendorLoginFlow } from '@/app/(app)/[orgId]/tasks/[taskId]/components/browser-automations/ConnectVendorLoginFlow';
import { clearConnectState } from '@/app/(app)/[orgId]/tasks/[taskId]/components/browser-automations/connect-flow-storage';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import { Button, Section } from '@trycompai/design-system';
import { Add, Close, Locked } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useTotpStatuses } from '../../../tasks/[taskId]/hooks/useTotpStatuses';
import { methodOf, permanenceStateOf, type Connection } from './connection-format';
import { ConnectionsTable } from './ConnectionsTable';
import { MakePermanentSheet } from './MakePermanentSheet';
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

  const [permanentConnection, setPermanentConnection] = useState<Connection | null>(
    null,
  );
  const [permanentOpen, setPermanentOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Live automatic-2FA status per connection, fetched only when the org has a
  // password connection (SSO connections can't store a key). Drives the row
  // states and the "make permanent" nudge.
  const hasPasswordConnection = profiles.some((c) => methodOf(c) === 'password');
  const {
    statuses: totpStatuses,
    isLoading: totpStatusesLoading,
    mutate: mutateTotpStatuses,
  } = useTotpStatuses(hasPasswordConnection);

  // Password connections that work now but will pause when the vendor next asks
  // for a code — the ones "Make permanent" fixes.
  const atRisk = useMemo(
    () =>
      profiles.filter(
        (c) =>
          permanenceStateOf({
            connection: c,
            totpConfigured: totpStatuses[c.id] ?? false,
          }) === 'atrisk',
      ),
    [profiles, totpStatuses],
  );
  const showBanner =
    canUpdate && !bannerDismissed && !totpStatusesLoading && atRisk.length > 0;

  const fetchProfiles = useCallback(async () => {
    const res = await apiClient.get<Connection[]>('/v1/browserbase/profiles');
    // apiClient resolves (doesn't throw) on an HTTP error — surface it and keep
    // the connections we already have instead of blanking the list to "none".
    if (res.error) {
      toast.error('Could not load connections. Please refresh.');
      return;
    }
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
        const res = await apiClient.patch(
          `/v1/browserbase/profiles/${connection.id}`,
          { displayName: name },
        );
        if (res.error) {
          toast.error(res.error || 'Could not rename.');
          return;
        }
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
        const res = await apiClient.post(
          `/v1/browserbase/profiles/${connection.id}/credentials`,
          creds,
        );
        if (res.error) {
          toast.error(res.error || 'Could not update the login.');
          return;
        }
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
      const res = await apiClient.post(
        `/v1/browserbase/profiles/${connection.id}/totp`,
        { totpSeed },
      );
      if (res.error) {
        toast.error(res.error || 'Could not save the authenticator key.');
        return;
      }
      await mutateTotpStatuses();
      toast.success('Automatic 2FA is on. Scheduled runs generate the code for you.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the authenticator key.');
    } finally {
      setBusy(false);
    }
  }, [mutateTotpStatuses]);

  const handleClearTotp = useCallback(async (connection: Connection) => {
    setBusy(true);
    try {
      const res = await apiClient.delete(
        `/v1/browserbase/profiles/${connection.id}/totp`,
      );
      if (res.error) {
        toast.error(res.error || 'Could not turn off automatic 2FA.');
        return;
      }
      await mutateTotpStatuses();
      toast.success('Automatic 2FA turned off.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not turn off automatic 2FA.');
    } finally {
      setBusy(false);
    }
  }, [mutateTotpStatuses]);

  const handleMakePermanent = useCallback((connection: Connection) => {
    setManageOpen(false);
    setPermanentConnection(connection);
    setPermanentOpen(true);
  }, []);

  // The Make-Permanent sheet drives its own success screen, so this returns
  // whether the key saved (no toast on success) and refreshes the row states.
  const handleSaveTotp = useCallback(
    async (
      connection: { id: string },
      totpSeed: string,
    ): Promise<boolean> => {
      const res = await apiClient.post(
        `/v1/browserbase/profiles/${connection.id}/totp`,
        { totpSeed },
      );
      if (res.error) {
        toast.error(res.error || 'Could not save the authenticator key.');
        return false;
      }
      await mutateTotpStatuses();
      return true;
    },
    [mutateTotpStatuses],
  );

  const handleRemove = useCallback(
    async (connection: Connection) => {
      setBusy(true);
      try {
        const res = await apiClient.delete(
          `/v1/browserbase/profiles/${connection.id}`,
        );
        if (res.error) {
          toast.error(res.error || 'Could not remove.');
          return;
        }
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

  return (
    <Section
      description="The vendor logins your evidence tasks use to sign in and capture audit evidence automatically."
      actions={
        canConnect ? (
          <Button onClick={openConnect} iconLeft={<Add size={14} />}>
            Connect a vendor
          </Button>
        ) : undefined
      }
    >
      <div className="mt-4 flex flex-col gap-4">
        {/* Orient anyone who lands here from Settings without knowing the feature:
            what it does, that it's unattended, and where the automations live. */}
        <div className="rounded-lg border border-border bg-muted/30 p-3.5">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            How it works
          </div>
          <ol className="flex flex-col gap-1.5 text-[12px] leading-relaxed text-muted-foreground">
            <li className="flex gap-1.5">
              <span className="shrink-0 text-foreground">1.</span>
              <span>
                Connect a vendor login here — Comp AI signs in for you, including any
                two-factor codes.
              </span>
            </li>
            <li className="flex gap-1.5">
              <span className="shrink-0 text-foreground">2.</span>
              <span>
                On a schedule it signs in, screenshots the required page as audit evidence,
                and re-signs in on its own when a session expires.
              </span>
            </li>
            <li className="flex gap-1.5">
              <span className="shrink-0 text-foreground">3.</span>
              <span>
                You add the automations that use these logins inside an{' '}
                <span className="text-foreground">evidence task</span>, in its
                &ldquo;Browser evidence&rdquo; section.
              </span>
            </li>
          </ol>
        </div>

        {showBanner && (
          <div className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-primary/[0.04] p-3.5">
            <span
              className="grid h-8 w-8 flex-none place-items-center rounded-md"
              style={{
                background: 'color-mix(in oklab, var(--primary) 10%, transparent)',
                color: 'color-mix(in oklab, var(--primary) 65%, var(--foreground))',
              }}
            >
              <Locked size={16} />
            </span>
            <div className="min-w-0 flex-1 basis-[260px]">
              <div className="text-[13px] text-foreground">
                {atRisk.length === 1
                  ? '1 connection can stay signed in on its own'
                  : `${atRisk.length} connections can stay signed in on their own`}
              </div>
              <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                Add an authenticator setup key and Comp AI generates the 6-digit code at
                every run — no manual re-sign-ins.
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => atRisk[0] && handleMakePermanent(atRisk[0])}
              >
                Make permanent
              </Button>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setBannerDismissed(true)}
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Close size={14} />
              </button>
            </div>
          </div>
        )}

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
          totpStatuses={totpStatuses}
          statusesLoading={totpStatusesLoading}
          onReconnect={handleReconnect}
          onManage={handleManage}
          onMakePermanent={handleMakePermanent}
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

      <MakePermanentSheet
        connection={permanentConnection}
        open={permanentOpen}
        onOpenChange={setPermanentOpen}
        onSave={handleSaveTotp}
      />
      </div>
    </Section>
  );
}
