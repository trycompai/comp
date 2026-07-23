'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BrowserAutomation, BrowserAutomationDraft } from '../hooks/types';
import { useBrowserAutomationDrafts } from '../hooks/useBrowserAutomationDrafts';
import { useBrowserAutomations } from '../hooks/useBrowserAutomations';
import { useBrowserContext } from '../hooks/useBrowserContext';
import { useBrowserExecution } from '../hooks/useBrowserExecution';
import { useBrowserProfiles } from '../hooks/useBrowserProfiles';
import {
  BrowserAutomationsList,
  BrowserLiveView,
  ConnectVendorLoginFlow,
  EmptyWithContextState,
  InstructionComposer,
  type ConnectionRef,
} from './browser-automations';
import { BrowserEvidenceEmptyState } from './browser-automations/BrowserEvidenceEmptyState';
import { DraftsStrip } from './browser-automations/DraftsStrip';
import {
  clearConnectState,
  loadConnectState,
} from './browser-automations/connect-flow-storage';

interface BrowserAutomationsProps {
  taskId: string;
  /** When true, disables creating new automations (shows existing ones read-only) */
  isManualTask?: boolean;
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function BrowserAutomations({ taskId, isManualTask = false }: BrowserAutomationsProps) {
  const [composer, setComposer] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    automation?: BrowserAutomation;
    /** When set, the composer targets this specific connection (add to a vendor). */
    connection?: ConnectionRef;
    /** When set, the composer resumes this saved draft. */
    draft?: BrowserAutomationDraft;
  }>({ open: false, mode: 'create' });
  const [authUrl, setAuthUrl] = useState('https://github.com');
  const [connectOpen, setConnectOpen] = useState(false);
  // When set, the connect flow re-authenticates an existing connection instead
  // of connecting a new one.
  const [reconnectSeed, setReconnectSeed] = useState<{
    url: string;
    mode: 'password' | 'sso';
  } | null>(null);
  // Whether the user just connected within THIS task — org-level connection
  // status must not make a fresh task look already set up.
  const [justConnected, setJustConnected] = useState(false);
  const authHostname = hostnameFromUrl(authUrl);

  // Hooks
  const context = useBrowserContext();
  const automations = useBrowserAutomations({ taskId });
  const { profiles, fetchProfiles } = useBrowserProfiles();
  const {
    drafts,
    fetchDrafts,
    createDraft,
    updateDraft,
    deleteDraft,
  } = useBrowserAutomationDrafts({ taskId });

  // The draft currently being autosaved (created on first edit, reused after).
  const draftIdRef = useRef<string | null>(null);
  const creatingDraftRef = useRef(false);

  // Debounced autosave from the composer — create the draft on first content,
  // then keep updating the same row.
  const handleAutosave = useCallback(
    async (payload: { name: string; steps: BrowserAutomationDraft['steps'] }) => {
      if (draftIdRef.current) {
        await updateDraft(draftIdRef.current, payload);
        return;
      }
      if (creatingDraftRef.current) return; // avoid a double-create race
      creatingDraftRef.current = true;
      const created = await createDraft(payload);
      creatingDraftRef.current = false;
      if (created) {
        draftIdRef.current = created.id;
        void fetchDrafts();
      }
    },
    [createDraft, updateDraft, fetchDrafts],
  );

  const handleContinueDraft = useCallback((draft: BrowserAutomationDraft) => {
    draftIdRef.current = draft.id;
    setComposer({ open: true, mode: 'create', draft });
  }, []);

  const handleDeleteDraft = useCallback(
    (draft: BrowserAutomationDraft) => {
      if (draftIdRef.current === draft.id) draftIdRef.current = null;
      void deleteDraft(draft.id);
    },
    [deleteDraft],
  );

  const handleReconnect = useCallback(
    (url: string) => {
      const profile = profiles.find((p) => p.hostname === hostnameFromUrl(url));
      // Stored credentials → re-sign-in automatically; otherwise it's SSO, so the
      // AI drives to the identity provider and the user finishes there.
      const mode: 'password' | 'sso' = profile?.vaultExternalItemRef
        ? 'password'
        : 'sso';
      clearConnectState(taskId);
      setReconnectSeed({ url, mode });
      setConnectOpen(true);
    },
    [taskId, profiles],
  );

  const handleNeedsReauth = useCallback(
    (automationId: string) => {
      const automation = automations.automations.find((item) => item.id === automationId);
      const targetUrl = automation?.targetUrl ?? authUrl;
      setAuthUrl(targetUrl);
      context.startAuth(targetUrl);
    },
    [automations.automations, authUrl, context],
  );

  const execution = useBrowserExecution({
    onNeedsReauth: handleNeedsReauth,
    onComplete: automations.fetchAutomations,
  });

  const handleConnected = useCallback(
    async (url: string) => {
      // Bind new instructions to the vendor that was just connected — otherwise
      // connection resolution can fall back to a stale profile from another host.
      setAuthUrl(url);
      setJustConnected(true);
      clearConnectState(taskId);
      context.checkContextStatus();
      // Load the fresh connection before opening the composer so it resolves the
      // just-connected vendor (not a stale profile). Keep the connect view up
      // during the load so there's no flash back to the empty state.
      await Promise.all([fetchProfiles(), automations.fetchAutomations()]);
      setConnectOpen(false);
      // One flow: go straight into writing the first instruction.
      setComposer({ open: true, mode: 'create' });
    },
    [taskId, context, automations, fetchProfiles],
  );

  // Connect a brand-new vendor (a new connection) — start the connect flow fresh.
  const handleConnectAnother = useCallback(() => {
    clearConnectState(taskId);
    setConnectOpen(true);
  }, [taskId]);

  // A reconnect verified — refresh the connection list; don't open the composer.
  const handleReconnected = useCallback(() => {
    clearConnectState(taskId);
    setConnectOpen(false);
    setReconnectSeed(null);
    context.checkContextStatus();
    fetchProfiles();
    automations.fetchAutomations();
  }, [taskId, context, fetchProfiles, automations]);

  const handleCancelConnect = useCallback(() => {
    clearConnectState(taskId);
    setConnectOpen(false);
    setReconnectSeed(null);
  }, [taskId]);

  // Resolve the connection an instruction should run under: the edited
  // automation's site, else the just-connected site, else the task's existing
  // connection. Instructions are connection-scoped; the URL defaults from here.
  const buildConnectionRef = useCallback(
    (automation?: BrowserAutomation): ConnectionRef | null => {
      const findByHost = (host: string) => profiles.find((p) => p.hostname === host);
      const toRef = (
        profile: {
          id: string;
          hostname: string;
          displayName: string;
          status: ConnectionRef['status'];
        },
        url: string,
      ): ConnectionRef => ({
        profileId: profile.id,
        hostname: profile.hostname,
        displayName: profile.displayName || profile.hostname,
        url,
        status: profile.status,
      });

      if (automation) {
        const match = findByHost(hostnameFromUrl(automation.targetUrl));
        if (match) return toRef(match, automation.targetUrl);
      }
      const justConnectedProfile = findByHost(authHostname);
      if (justConnectedProfile) return toRef(justConnectedProfile, authUrl);

      const firstAutomation = automations.automations[0];
      if (firstAutomation) {
        const match = findByHost(hostnameFromUrl(firstAutomation.targetUrl));
        if (match) return toRef(match, firstAutomation.targetUrl);
      }
      const fallback = profiles.find((p) => p.status === 'verified') ?? profiles[0];
      if (fallback) return toRef(fallback, `https://${fallback.hostname}`);
      return null;
    },
    [profiles, authHostname, authUrl, automations.automations],
  );

  const closeComposer = useCallback(() => {
    // Keep the draft on the server (resumable); just detach and surface it.
    draftIdRef.current = null;
    setComposer({ open: false, mode: 'create' });
    void fetchDrafts();
  }, [fetchDrafts]);

  const handleComposerSaved = useCallback(() => {
    // Saved for real → discard the draft it came from.
    const finalizedDraftId = draftIdRef.current;
    draftIdRef.current = null;
    if (finalizedDraftId) void deleteDraft(finalizedDraftId);
    setComposer({ open: false, mode: 'create' });
    automations.fetchAutomations();
  }, [automations, deleteDraft]);

  // If a background analysis was in flight when the user navigated away, reopen
  // the connect flow on return so it can resume instead of forcing a restart.
  useEffect(() => {
    if (loadConnectState(taskId)) setConnectOpen(true);
  }, [taskId]);

  // Refresh the connection list whenever a connect/reconnect verifies.
  useEffect(() => {
    if (context.status === 'has-context') fetchProfiles();
  }, [context.status, fetchProfiles]);

  // Initialize
  useEffect(() => {
    context.checkContextStatus();
    automations.fetchAutomations();
  }, [context.checkContextStatus, automations.fetchAutomations]);

  const composerConnection = useMemo(() => {
    if (!composer.open) return null;
    if (composer.connection) return composer.connection;
    // Resuming a draft — anchor to its first step's connection.
    const firstProfileId = composer.draft?.steps?.[0]?.profileId ?? undefined;
    const profile = firstProfileId
      ? profiles.find((item) => item.id === firstProfileId)
      : undefined;
    if (profile) {
      return {
        profileId: profile.id,
        hostname: profile.hostname,
        displayName: profile.displayName || profile.hostname,
        url: `https://${profile.hostname}`,
        status: profile.status,
      };
    }
    return buildConnectionRef(composer.automation);
  }, [
    composer.open,
    composer.connection,
    composer.draft,
    composer.automation,
    profiles,
    buildConnectionRef,
  ]);

  // Every connection the org has — each step in the composer can pick its own.
  const allConnections = useMemo<ConnectionRef[]>(
    () =>
      profiles.map((profile) => ({
        profileId: profile.id,
        hostname: profile.hostname,
        displayName: profile.displayName || profile.hostname,
        url: `https://${profile.hostname}`,
        status: profile.status,
      })),
    [profiles],
  );

  // Loading state
  if (automations.isLoading) {
    return null;
  }

  // Execution live view
  if (execution.isExecuting && execution.liveViewUrl) {
    const runningAutomation = automations.automations.find(
      (a) => a.id === execution.runningAutomationId,
    );
    return (
      <BrowserLiveView
        title={`Running: ${runningAutomation?.name || 'Automation'}`}
        subtitle="Watching AI navigate and capture screenshot..."
        liveViewUrl={execution.liveViewUrl}
        variant="execution"
        onCancel={execution.cancelExecution}
      />
    );
  }

  // Connect flow — smart, self-contained: analyze → sign in → capture → connected
  if (connectOpen) {
    return (
      <ConnectVendorLoginFlow
        taskId={taskId}
        onConnected={handleConnected}
        onCancel={handleCancelConnect}
        reconnect={reconnectSeed ?? undefined}
        onReconnected={handleReconnected}
      />
    );
  }

  // Auth flow live view (reconnect of an existing profile)
  if (context.showAuthFlow && context.liveViewUrl) {
    return (
      <BrowserLiveView
        title={`Log in to ${authHostname}`}
        subtitle="Complete login in this browser, then check and save the profile for this site."
        liveViewUrl={context.liveViewUrl}
        variant="auth"
        isChecking={context.status === 'checking'}
        onSave={() => context.checkAuth(authUrl)}
        onCancel={() => {
          context.cancelAuth();
          setConnectOpen(false);
        }}
      />
    );
  }

  // Instruction composer (create/edit) — write, watch the AI test it, then save.
  if (composer.open && composerConnection) {
    return (
      <InstructionComposer
        taskId={taskId}
        connection={composerConnection}
        connections={allConnections}
        mode={composer.mode}
        initialValues={composer.automation}
        isSaving={automations.isSaving}
        onCancel={closeComposer}
        onCreate={automations.createAutomation}
        onUpdate={automations.updateAutomation}
        onSaved={handleComposerSaved}
        onReconnect={(conn) => handleReconnect(conn.url)}
        draftSteps={composer.draft?.steps}
        onAutosave={handleAutosave}
      />
    );
  }

  // For manual tasks with no existing automations, don't show empty states
  if (isManualTask && automations.automations.length === 0) {
    return null;
  }

  // A task with no automations of its own isn't set up yet — show the onboarding,
  // even if the ORG already has a connection from another task. Once the user
  // connects here, `justConnected` advances to the "add your first automation"
  // state. Connections are org-level and reused, so connecting an already-connected
  // vendor simply reuses the saved session.
  // A pending draft means the task is mid-setup — don't drop back to first-run.
  if (
    !isManualTask &&
    automations.automations.length === 0 &&
    !justConnected &&
    drafts.length === 0
  ) {
    return (
      <BrowserEvidenceEmptyState
        isStartingAuth={context.isStartingAuth}
        onConnect={() => setConnectOpen(true)}
      />
    );
  }

  // No saved automations yet, but a connection and/or a draft exists — prompt to
  // create the first one, with any drafts pinned above to resume.
  if (!isManualTask && automations.automations.length === 0) {
    return (
      <>
        <DraftsStrip
          drafts={drafts}
          profiles={profiles}
          onContinue={handleContinueDraft}
          onDelete={handleDeleteDraft}
        />
        <EmptyWithContextState
          onCreateClick={() => setComposer({ open: true, mode: 'create' })}
        />
      </>
    );
  }

  // List of automations (disable creation for manual tasks, but allow editing)
  return (
    <>
      <DraftsStrip
        drafts={drafts}
        profiles={profiles}
        onContinue={handleContinueDraft}
        onDelete={handleDeleteDraft}
      />
      <BrowserAutomationsList
      automations={automations.automations}
      profiles={profiles}
      runningAutomationId={execution.runningAutomationId}
      onRun={execution.runAutomation}
      onReconnect={handleReconnect}
      onCreate={isManualTask ? undefined : () => setComposer({ open: true, mode: 'create' })}
      onConnectAnother={isManualTask ? undefined : handleConnectAnother}
      onEditClick={(automation) => setComposer({ open: true, mode: 'edit', automation })}
      onDelete={automations.deleteAutomation}
      onToggleEnabled={automations.toggleAutomation}
      onSetTaskSchedule={automations.setTaskSchedule}
      />
    </>
  );
}
