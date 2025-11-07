'use client';

import { cn } from '@/lib/utils';
import { useChat } from '@ai-sdk/react';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { EvidenceAutomationVersion } from '@db';
import { Code, Loader2, RotateCcw, Upload, Zap } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { restoreVersion } from '../../actions/task-automation-actions';
import {
  useTaskAutomation,
  useTaskAutomationAnalyze,
  useTaskAutomationExecution,
  useTaskAutomationScript,
} from '../../hooks';
import { useAutomationVersions } from '../../hooks/use-automation-versions';
import { useSharedChatContext } from '../../lib/chat-context';
import { useTaskAutomationStore } from '../../lib/task-automation-store';
import type { ChatUIMessage } from '../chat/types';
import { Panel, PanelHeader } from '../panels/panels';
import { PublishDialog } from '../PublishDialog';
import {
  CodeViewer,
  EmptyState,
  TestResultsPanel,
  UnifiedWorkflowCard,
  ViewModeSwitch,
  WorkflowSkeleton,
} from './components';
import type { TestResult } from './types';

interface Props {
  className?: string;
}

export function WorkflowVisualizerSimple({ className }: Props) {
  const { scriptGenerated, viewMode, setViewMode, setScriptUrl } = useTaskAutomationStore();
  const { orgId, taskId, automationId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();
  const { chat, automationIdRef } = useSharedChatContext();
  const { sendMessage } = useChat<ChatUIMessage>({ chat });
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<EvidenceAutomationVersion | null>(null);
  const {
    automation,
    mutate: mutateAutomation,
    isLoading: isLoadingAutomation,
  } = useTaskAutomation();
  const { versions } = useAutomationVersions();

  // Update shared ref when automation is loaded from hook
  if (automation?.id && automationIdRef.current === 'new') {
    automationIdRef.current = automation.id;
  }

  const {
    script,
    isLoading: isLoadingScript,
    refresh,
  } = useTaskAutomationScript({
    orgId: orgId,
    taskId: taskId,
    automationId: automationIdRef.current,
    enabled: !!orgId && !!taskId && automationIdRef.current !== 'new',
  });

  const handleRestoreVersion = async (version: EvidenceAutomationVersion) => {
    setIsRestoring(true);

    try {
      const result = await restoreVersion(orgId, taskId, automationIdRef.current, version.version);

      if (!result.success) {
        throw new Error(result.error || 'Failed to restore version');
      }

      toast.success(`Draft overwritten with version ${version.version}`);
      setConfirmRestore(null);

      // Refresh the script to show the restored content
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore version');
    } finally {
      setIsRestoring(false);
    }
  };

  useEffect(() => {
    const handleScriptSaved = () => {
      refresh();
      // Also refresh automation data to get updated evaluationCriteria
      mutateAutomation();
    };
    const handleCriteriaUpdated = () => {
      mutateAutomation();
    };
    window.addEventListener('task-automation:script-saved', handleScriptSaved);
    window.addEventListener('task-automation:criteria-updated', handleCriteriaUpdated);
    return () => {
      window.removeEventListener('task-automation:script-saved', handleScriptSaved);
      window.removeEventListener('task-automation:criteria-updated', handleCriteriaUpdated);
    };
  }, [refresh, mutateAutomation]);

  useEffect(() => {
    if (script && !scriptGenerated) {
      const setScriptGenerated = useTaskAutomationStore.getState().setScriptGenerated;
      setScriptGenerated(true, script.key);
    }
  }, [script, scriptGenerated]);

  useEffect(() => {
    // Update store with script URL (empty string if no script exists)
    setScriptUrl(script?.key || undefined);
  }, [script, setScriptUrl]);

  const {
    execute,
    isExecuting,
    result: executionResult,
    error: executionError,
    reset: resetExecution,
  } = useTaskAutomationExecution();

  const { steps, isAnalyzing, integrationsUsed, title } = useTaskAutomationAnalyze({
    scriptContent: script?.content,
    enabled: !!script?.content,
  });

  const testResult = useMemo<TestResult | null>(() => {
    if (!executionResult && !executionError) return null;
    if (executionError) return { status: 'error', error: executionError.message };
    if (executionResult) {
      // Check if the function returned an error response
      const hasErrorInData =
        executionResult.data &&
        typeof executionResult.data === 'object' &&
        'ok' in executionResult.data &&
        executionResult.data.ok === false;

      return {
        status: executionResult.success && !hasErrorInData ? 'success' : 'error',
        message:
          executionResult.success && !hasErrorInData
            ? 'Automation executed successfully'
            : undefined,
        data: executionResult.data,
        logs: executionResult.logs,
        error: executionResult.error || (hasErrorInData ? executionResult.data.error : undefined),
        summary: (executionResult as any).summary,
        evaluationStatus: executionResult.evaluationStatus,
        evaluationReason: executionResult.evaluationReason,
      };
    }
    return null;
  }, [executionResult, executionError]);

  const handleTest = async () => {
    if (!orgId || !taskId || automationIdRef.current === 'new') {
      console.warn('Cannot test ephemeral automation');
      return;
    }
    await execute();
  };

  const handleLetAIFix = () => {
    if (!testResult || testResult.status !== 'error') return;

    // Create a detailed error message for the AI
    const errorMessage = `The automation script failed with the following error:

Error: ${testResult.error || testResult.message || 'Unknown error'}

${
  testResult.data
    ? `Function returned:
${JSON.stringify(testResult.data, null, 2)}`
    : ''
}

${
  testResult.logs && testResult.logs.length > 0
    ? `Execution Logs:
${testResult.logs.join('\n')}`
    : ''
}

Please fix the automation script to resolve this error.`;

    // Send the error to the chat
    sendMessage(
      { text: errorMessage },
      {
        body: {
          modelId: 'openai/gpt-5-mini',
          reasoningEffort: 'medium',
          orgId,
          taskId,
          automationId,
        },
      },
    );

    // Close the dialog
    resetExecution();
  };

  const showEmptyState = !isLoadingScript && !script && steps.length === 0;
  const showLoading = isLoadingScript || (script && isAnalyzing);

  if (showEmptyState) {
    return (
      <Panel className={cn('flex flex-col border-t-0 rounded-t-none', className)}>
        <PanelHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Integration Builder
              </h2>
            </div>
            <ViewModeSwitch value={viewMode} onChange={setViewMode} />
          </div>
        </PanelHeader>
        <EmptyState type="automation" />
      </Panel>
    );
  }

  return (
    <Panel className={cn('flex flex-col border-t-0 rounded-t-none', className)}>
      <PanelHeader className="border-b border-border">
        <div className="flex items-center justify-between w-full">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Code className={`w-4 h-4 text-primary ${isAnalyzing ? 'animate-pulse' : ''}`} />
              Integration Builder
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <ViewModeSwitch value={viewMode} onChange={setViewMode} />
            {script && !showEmptyState && (
              <>
                {versions && versions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={isRestoring}
                        title="Rollback to version"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Overwrite draft with version</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {versions.map((version) => (
                        <DropdownMenuItem
                          key={version.id}
                          onClick={() => setConfirmRestore(version)}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">Version {version.version}</span>
                            {version.changelog && (
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {version.changelog}
                              </span>
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button size="sm" onClick={() => setPublishDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              </>
            )}
          </div>
        </div>
      </PanelHeader>

      <div className="flex-1 overflow-auto bg-secondary">
        {/* Show Test Results Panel INSTEAD of regular content when testing/results available */}
        {isExecuting || testResult ? (
          <TestResultsPanel
            isExecuting={isExecuting}
            result={testResult}
            onLetAIFix={handleLetAIFix}
            onBack={() => resetExecution()}
            evaluationCriteria={automation?.evaluationCriteria}
          />
        ) : (
          /* Regular Content - Only show when NOT testing */
          <div
            className={cn(
              'h-full',
              viewMode === 'visual' && 'p-8 flex justify-center items-center',
            )}
          >
            <div
              className={cn(
                viewMode === 'visual' && 'max-w-3xl mx-auto w-full flex flex-col gap-6',
              )}
            >
              {viewMode === 'visual' ? (
                // Visual Mode
                <>
                  {showLoading ? (
                    <WorkflowSkeleton />
                  ) : steps.length > 0 ? (
                    <UnifiedWorkflowCard
                      key={`workflow-${automation?.id}-${automation?.evaluationCriteria ? 'with-criteria' : 'no-criteria'}`}
                      steps={steps}
                      title={title || 'Automation Workflow'}
                      onTest={handleTest}
                      integrationsUsed={integrationsUsed || []}
                      evaluationCriteria={automation?.evaluationCriteria}
                      automationId={automation?.id}
                    />
                  ) : (
                    <EmptyState type="workflow" />
                  )}
                </>
              ) : (
                // Code Mode
                <div className="h-full">
                  <CodeViewer content={script?.content || ''} isLoading={showLoading} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <PublishDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen} />

      <Dialog open={!!confirmRestore} onOpenChange={(open) => !open && setConfirmRestore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Overwrite Draft with Version {confirmRestore?.version}?</DialogTitle>
            <DialogDescription>
              This will replace your current draft with the script from version{' '}
              {confirmRestore?.version}. This action is irreversible - your current draft will be
              permanently lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestore(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmRestore && handleRestoreVersion(confirmRestore)}
              variant="destructive"
              disabled={isRestoring}
            >
              {isRestoring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isRestoring ? 'Overwriting...' : 'Overwrite Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
