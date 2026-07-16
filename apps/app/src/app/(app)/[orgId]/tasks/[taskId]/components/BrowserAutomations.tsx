'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BrowserAutomation } from '../hooks/types';
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
  }>({ open: false, mode: 'create' });
  const [authUrl, setAuthUrl] = useState('https://github.com');
  const [connectOpen, setConnectOpen] = useState(false);
  // Whether the user just connected within THIS task — org-level connection
  // status must not make a fresh task look already set up.
  const [justConnected, setJustConnected] = useState(false);
  const authHostname = hostnameFromUrl(authUrl);

  // Hooks
  const context = useBrowserContext();
  const automations = useBrowserAutomations({ taskId });
  const { profiles, fetchProfiles } = useBrowserProfiles();

  const handleReconnect = useCallback(
    (url: string) => {
      setAuthUrl(url);
      context.startAuth(url);
    },
    [context],
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

  const handleConnected = useCallback(() => {
    clearConnectState(taskId);
    setConnectOpen(false);
    setJustConnected(true);
    context.checkContextStatus();
    automations.fetchAutomations();
    fetchProfiles();
  }, [taskId, context, automations, fetchProfiles]);

  const handleCancelConnect = useCallback(() => {
    clearConnectState(taskId);
    setConnectOpen(false);
  }, [taskId]);

  // Resolve the connection an instruction should run under: the edited
  // automation's site, else the just-connected site, else the task's existing
  // connection. Instructions are connection-scoped; the URL defaults from here.
  const buildConnectionRef = useCallback(
    (automation?: BrowserAutomation): ConnectionRef | null => {
      const findByHost = (host: string) => profiles.find((p) => p.hostname === host);
      const toRef = (
        profile: { id: string; hostname: string; displayName: string },
        url: string,
      ): ConnectionRef => ({
        profileId: profile.id,
        hostname: profile.hostname,
        displayName: profile.displayName || profile.hostname,
        url,
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

  const closeComposer = useCallback(() => setComposer({ open: false, mode: 'create' }), []);
  const handleComposerSaved = useCallback(() => {
    closeComposer();
    automations.fetchAutomations();
  }, [closeComposer, automations]);

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

  const composerConnection = useMemo(
    () => (composer.open ? buildConnectionRef(composer.automation) : null),
    [composer.open, composer.automation, buildConnectionRef],
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
        mode={composer.mode}
        initialValues={composer.automation}
        isSaving={automations.isSaving}
        onCancel={closeComposer}
        onCreate={automations.createAutomation}
        onUpdate={automations.updateAutomation}
        onSaved={handleComposerSaved}
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
  if (!isManualTask && automations.automations.length === 0 && !justConnected) {
    return (
      <BrowserEvidenceEmptyState
        isStartingAuth={context.isStartingAuth}
        onConnect={() => setConnectOpen(true)}
      />
    );
  }

  // Just connected here, but no automations yet — prompt to create the first one.
  if (!isManualTask && automations.automations.length === 0) {
    return (
      <EmptyWithContextState
        onCreateClick={() => setComposer({ open: true, mode: 'create' })}
      />
    );
  }

  // List of automations (disable creation for manual tasks, but allow editing)
  return (
    <BrowserAutomationsList
      automations={automations.automations}
      profiles={profiles}
      runningAutomationId={execution.runningAutomationId}
      onRun={execution.runAutomation}
      onReconnect={handleReconnect}
      onCreateClick={
        isManualTask ? undefined : () => setComposer({ open: true, mode: 'create' })
      }
      onEditClick={(automation) => setComposer({ open: true, mode: 'edit', automation })}
      onDelete={automations.deleteAutomation}
      onToggleEnabled={automations.toggleAutomation}
      onConnectionChanged={() => {
        fetchProfiles();
        automations.fetchAutomations();
      }}
    />
  );
}
