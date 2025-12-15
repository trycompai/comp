'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useBrowserAutomations } from '../hooks/useBrowserAutomations';
import { useBrowserContext } from '../hooks/useBrowserContext';
import { useBrowserExecution } from '../hooks/useBrowserExecution';
import type { BrowserAutomation } from '../hooks/types';
import {
  BrowserAutomationsList,
  BrowserLiveView,
  BrowserAutomationConfigDialog,
  EmptyWithContextState,
  NoContextState,
} from './browser-automations';

interface BrowserAutomationsProps {
  taskId: string;
}

export function BrowserAutomations({ taskId }: BrowserAutomationsProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    automation?: BrowserAutomation;
  }>({ open: false, mode: 'create' });
  const [authUrl, setAuthUrl] = useState('https://github.com');

  // Hooks
  const context = useBrowserContext({ organizationId: orgId });
  const automations = useBrowserAutomations({ taskId, organizationId: orgId });

  const handleNeedsReauth = useCallback(() => {
    context.startAuth(authUrl);
  }, [context, authUrl]);

  const execution = useBrowserExecution({
    organizationId: orgId,
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

  // No context - show setup prompt
  if (context.status === 'no-context' && automations.automations.length === 0) {
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

  // Empty state with context
  if (automations.automations.length === 0) {
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

  // List of automations
  return (
    <>
      <BrowserAutomationsList
        automations={automations.automations}
        hasContext={context.status === 'has-context'}
        runningAutomationId={execution.runningAutomationId}
        onRun={execution.runAutomation}
        onCreateClick={() => setDialogState({ open: true, mode: 'create' })}
        onEditClick={(automation) =>
          setDialogState({ open: true, mode: 'edit', automation })
        }
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
