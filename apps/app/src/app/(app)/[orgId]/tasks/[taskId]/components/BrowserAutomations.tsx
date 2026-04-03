'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BrowserAutomation } from '../hooks/types';
import { useBrowserAutomations } from '../hooks/useBrowserAutomations';
import { useBrowserContext } from '../hooks/useBrowserContext';
import { useBrowserExecution } from '../hooks/useBrowserExecution';
import {
  BrowserAutomationConfigDialog,
  BrowserAutomationsList,
  BrowserLiveView,
  EmptyWithContextState,
  NoContextState,
} from './browser-automations';

interface BrowserAutomationsProps {
  taskId: string;
  /** When true, disables creating new automations (shows existing ones read-only) */
  isManualTask?: boolean;
}

export function BrowserAutomations({ taskId, isManualTask = false }: BrowserAutomationsProps) {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    automation?: BrowserAutomation;
  }>({ open: false, mode: 'create' });
  const [authUrl, setAuthUrl] = useState('https://github.com');

  // Hooks
  const context = useBrowserContext();
  const automations = useBrowserAutomations({ taskId });

  const handleNeedsReauth = useCallback(() => {
    context.startAuth(authUrl);
  }, [context, authUrl]);

  const execution = useBrowserExecution({
    onNeedsReauth: handleNeedsReauth,
    onComplete: automations.fetchAutomations,
  });

  // Initialize
  useEffect(() => {
    context.checkContextStatus();
    automations.fetchAutomations();
  }, [context.checkContextStatus, automations.fetchAutomations]);

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

  // Auth flow live view
  if (context.showAuthFlow && context.liveViewUrl) {
    return (
      <BrowserLiveView
        title="Connect Browser"
        subtitle="Log in to the website below to enable automations"
        liveViewUrl={context.liveViewUrl}
        variant="auth"
        isChecking={context.status === 'checking'}
        onSave={() => context.checkAuth(authUrl)}
        onCancel={context.cancelAuth}
      />
    );
  }

  // For manual tasks with no existing automations, don't show empty states
  if (isManualTask && automations.automations.length === 0) {
    return null;
  }

  // No context - show setup prompt (only for non-manual tasks)
  if (!isManualTask && context.status === 'no-context' && automations.automations.length === 0) {
    return (
      <NoContextState
        isStartingAuth={context.isStartingAuth}
        onStartAuth={(url) => {
          setAuthUrl(url);
          context.startAuth(url);
        }}
      />
    );
  }

  // Empty state with context (only for non-manual tasks)
  if (!isManualTask && automations.automations.length === 0) {
    return (
      <>
        <EmptyWithContextState
          onCreateClick={() => setDialogState({ open: true, mode: 'create' })}
        />
        <BrowserAutomationConfigDialog
          isOpen={dialogState.open}
          mode={dialogState.mode}
          initialValues={dialogState.automation}
          isSaving={automations.isSaving}
          onClose={() => setDialogState({ open: false, mode: 'create' })}
          onCreate={automations.createAutomation}
          onUpdate={automations.updateAutomation}
        />
      </>
    );
  }

  // List of automations (disable creation for manual tasks, but allow editing)
  return (
    <>
      <BrowserAutomationsList
        automations={automations.automations}
        hasContext={context.status === 'has-context'}
        runningAutomationId={execution.runningAutomationId}
        onRun={execution.runAutomation}
        onCreateClick={isManualTask ? undefined : () => setDialogState({ open: true, mode: 'create' })}
        onEditClick={(automation) => setDialogState({ open: true, mode: 'edit', automation })}
      />
      <BrowserAutomationConfigDialog
        isOpen={dialogState.open}
        mode={dialogState.mode}
        initialValues={dialogState.automation}
        isSaving={automations.isSaving}
        onClose={() => setDialogState({ open: false, mode: 'create' })}
        onCreate={automations.createAutomation}
        onUpdate={automations.updateAutomation}
      />
    </>
  );
}
