'use client';

import { Models } from '@/ai/constants';
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
import { AlertCircle, CheckCircle2, Play, Sparkles, Zap } from 'lucide-react';
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
  ViewModeSwitch,
  WorkflowSkeleton,
  WorkflowStepCard,
} from './components';

interface TestResult {
  status: 'success' | 'error';
  message?: string;
  data?: any;
  error?: string;
  logs?: string[];
}

interface Props {
  className?: string;
}

export function WorkflowVisualizerSimple({ className }: Props) {
  const { scriptGenerated, viewMode, setViewMode } = useTaskAutomationStore();
  const { orgId, taskId } = useParams<{ orgId: string; taskId: string }>();
  const { chat } = useSharedChatContext();
  const { sendMessage } = useChat<ChatUIMessage>({ chat });

  const {
    script,
    isLoading: isLoadingScript,
    refresh,
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
      { body: { modelId: Models.OpenAIGPT5, reasoningEffort: 'medium', orgId, taskId } },
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

      <div className={cn('flex-1 overflow-auto', viewMode === 'visual' && 'p-8')}>
        <div className={cn(viewMode === 'visual' && 'max-w-3xl mx-auto')}>
          {viewMode === 'visual' ? (
            // Visual Mode
            showLoading ? (
              <WorkflowSkeleton />
            ) : steps.length > 0 ? (
              <div className="space-y-6 pb-6">
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

      {/* Test Result Dialog */}
      <Dialog open={!!testResult} onOpenChange={() => resetExecution()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {testResult?.status === 'success' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Test Successful
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  Test Failed
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {testResult?.message || testResult?.error || 'View the test results below'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4">
            {testResult && testResult.logs && testResult.logs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Execution Logs:</h4>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto max-h-48 overflow-y-auto">
                  {testResult.logs.join('\n')}
                </pre>
              </div>
            )}

            {testResult && (
              <div>
                <h4 className="text-sm font-medium mb-2">Function Output:</h4>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                  {testResult.data !== undefined && testResult.data !== null
                    ? JSON.stringify(testResult.data, null, 2)
                    : testResult.status === 'success'
                      ? '(No output returned)'
                      : '(Execution failed)'}
                </pre>
              </div>
            )}
          </div>

          {testResult?.status === 'error' && (
            <DialogFooter>
              <Button onClick={handleLetAIFix}>
                <Sparkles className="w-4 h-4 mr-2" />
                Let AI Fix It
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
