'use client';

import { cn } from '@/lib/utils';
import { useChat } from '@ai-sdk/react';
import { Button } from '@comp/ui/button';
import { Code, Play, Zap } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import {
  useTaskAutomationExecution,
  useTaskAutomationScript,
  useTaskAutomationWorkflow,
} from '../../hooks';
import { useSharedChatContext } from '../../lib/chat-context';
import { useTaskAutomationStore } from '../../lib/task-automation-store';
import type { ChatUIMessage } from '../chat/types';
import { Panel, PanelHeader } from '../panels/panels';
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
  const { orgId, taskId } = useParams<{ orgId: string; taskId: string }>();
  const { chat } = useSharedChatContext();
  const { sendMessage } = useChat<ChatUIMessage>({ chat });

  const {
    script,
    isLoading: isLoadingScript,
    refresh,
  } = useTaskAutomationScript({
    orgId: orgId,
    taskId: taskId,
    enabled: !!orgId && !!taskId,
  });

  useEffect(() => {
    const handleScriptSaved = () => refresh();
    window.addEventListener('task-automation:script-saved', handleScriptSaved);
    return () => window.removeEventListener('task-automation:script-saved', handleScriptSaved);
  }, [refresh]);

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
  } = useTaskAutomationExecution({ orgId: orgId, taskId: taskId });

  const { steps, isAnalyzing, integrationsUsed, title } = useTaskAutomationWorkflow({
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
      };
    }
    return null;
  }, [executionResult, executionError]);

  const handleTest = async () => {
    if (!orgId || !taskId) return;
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
      { body: { modelId: 'openai/gpt-5-mini', reasoningEffort: 'medium', orgId, taskId } },
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
              <Button
                size="sm"
                onClick={handleTest}
                disabled={isExecuting || !script}
                variant="outline"
              >
                <Play className={cn('w-4 h-4', isExecuting && 'animate-pulse')} />
                {isExecuting ? `Testing...` : `Test`}
              </Button>
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
          />
        ) : (
          /* Regular Content - Only show when NOT testing */
          <div
            className={cn(
              'h-full',
              viewMode === 'visual' && 'p-8 flex justify-center items-center',
            )}
          >
            <div className={cn(viewMode === 'visual' && 'max-w-3xl mx-auto')}>
              {viewMode === 'visual' ? (
                // Visual Mode
                showLoading ? (
                  <WorkflowSkeleton />
                ) : steps.length > 0 ? (
                  <UnifiedWorkflowCard
                    steps={steps}
                    title={title}
                    onTest={handleTest}
                    integrationsUsed={integrationsUsed}
                  />
                ) : (
                  <EmptyState type="workflow" />
                )
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
    </Panel>
  );
}
