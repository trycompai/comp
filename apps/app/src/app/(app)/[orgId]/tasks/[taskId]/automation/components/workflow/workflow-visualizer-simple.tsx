'use client';

import { Models } from '@/ai/constants';
import { cn } from '@/lib/utils';
import { useChat } from '@ai-sdk/react';
import { Button } from '@comp/ui/button';
import { Play, Zap } from 'lucide-react';
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
  ViewModeSwitch,
  WorkflowSkeleton,
  WorkflowStepCard,
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
    scriptExists,
  } = useTaskAutomationScript({
    orgId: orgId || '',
    taskId: taskId || '',
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
  } = useTaskAutomationExecution({ orgId: orgId || '', taskId: taskId || '' });

  const { steps, isAnalyzing } = useTaskAutomationWorkflow({
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
      { body: { modelId: Models.OpenAIGPT5Mini, reasoningEffort: 'medium', orgId, taskId } },
    );

    // Close the dialog
    resetExecution();
  };

  const showEmptyState = !isLoadingScript && !script && steps.length === 0;
  const showLoading = isLoadingScript || (script && isAnalyzing);

  if (showEmptyState) {
    return (
      <Panel className={cn('flex flex-col', className)}>
        <PanelHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Your Automation
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
    <Panel className={cn('flex flex-col', className)}>
      <PanelHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Zap className={`w-4 h-4 text-primary ${isAnalyzing ? 'animate-pulse' : ''}`} />
              {isAnalyzing ? 'Analyzing Automation' : 'Your Automation'}
            </h2>
          </div>
          <ViewModeSwitch value={viewMode} onChange={setViewMode} />
        </div>
      </PanelHeader>

      <div className="flex-1 overflow-auto">
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
          <div className={cn('h-full', viewMode === 'visual' && 'p-8')}>
            <div className={cn(viewMode === 'visual' && 'max-w-3xl mx-auto')}>
              {viewMode === 'visual' ? (
                // Visual Mode
                showLoading ? (
                  <WorkflowSkeleton />
                ) : steps.length > 0 ? (
                  <div className="space-y-6 pb-6 max-w-md mx-auto">
                    {steps.map((step, index) => (
                      <WorkflowStepCard
                        key={step.id}
                        step={step}
                        index={index}
                        showConnection={index > 0}
                      />
                    ))}
                  </div>
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

      {/* Fixed Test Button */}
      {script && !showEmptyState && (
        <div className="flex items-center p-4.5 gap-3 border-t border-primary/20 bg-primary/5">
          <div className="flex justify-center w-full">
            <Button
              className="w-full"
              size="default"
              onClick={handleTest}
              disabled={isExecuting || !script}
            >
              <Play className={cn('w-4 h-4', isExecuting && 'animate-pulse')} />
              <span>{isExecuting ? `Testing Automation...` : `Test Automation`}</span>
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
