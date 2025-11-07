'use client';

import { cn } from '@/lib/utils';
import { Button } from '@comp/ui/button';
import { AlertCircle, CheckCircle2, CircleX, Loader2, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTaskAutomation } from '../../../hooks';
import { useSharedChatContext } from '../../../lib';
import type { TestResult } from '../types';
import { ConfettiEffect } from './ConfettiEffect';

interface Props {
  isExecuting: boolean;
  result: TestResult | null;
  onLetAIFix: () => void;
  onBack: () => void;
  evaluationCriteria?: string;
}

type ActiveSection = 'output' | 'logs' | 'reasoning' | null;

export function TestResultsPanel({
  isExecuting,
  result,
  onLetAIFix,
  onBack,
  evaluationCriteria,
}: Props) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('reasoning');
  const [animateSuccess, setAnimateSuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { automationIdRef } = useSharedChatContext();
  const { automation } = useTaskAutomation(automationIdRef.current);

  const actualEvaluationCriteria = automation?.evaluationCriteria || evaluationCriteria;

  // Determine overall test state
  const getTestState = () => {
    if (!result) return null;

    // Execution error - script failed to run
    if (result.status === 'error') {
      return {
        type: 'execution-error',
        title: '🚨 Execution Error',
        color: 'destructive',
      } as const;
    }

    // Script ran successfully
    if (result.status === 'success') {
      // Check evaluation if available
      if (result.evaluationStatus === 'pass') {
        return { type: 'pass', title: 'Test Passed', color: 'success' } as const;
      } else if (result.evaluationStatus === 'fail') {
        return { type: 'fail', title: 'Test Failed', color: 'destructive' } as const;
      }
      // No evaluation - just show execution success
      return { type: 'success', title: '🎉 Execution Success', color: 'primary' } as const;
    }

    return null;
  };

  const testState = getTestState();

  useEffect(() => {
    if (testState?.type === 'pass' || testState?.type === 'success') {
      setAnimateSuccess(true);
      const timer = setTimeout(() => setAnimateSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [testState]);

  // Reset states when results change
  useEffect(() => {
    if (!result && !isExecuting) {
      setAnimateSuccess(false);
    }
  }, [result, isExecuting]);

  if (isExecuting && !result) {
    return (
      <div className="h-full flex flex-col">
        <div className="h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40 animate-pulse" />
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <div className="w-20 h-20 rounded-full bg-primary/30" />
            </div>
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur ring-2 ring-primary/20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </div>
          <h3 className="mt-6 text-lg font-semibold text-foreground">Running your automation</h3>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
            We're testing your script in a secure environment. This usually takes 15-30 seconds.
          </p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  if (!testState) return null;

  const getColorClasses = () => {
    switch (testState.color) {
      case 'success':
        return {
          bg: 'bg-gradient-to-br from-green-500/5 via-green-500/10 to-green-500/5 border-green-500/20',
          iconBg: 'bg-green-500',
          iconGradient: 'from-green-500 to-green-600',
          glow1: 'bg-gradient-to-br from-green-500/20 to-green-500/10',
          glow2: 'bg-gradient-to-tr from-green-500/10 to-green-500/20',
        };
      case 'destructive':
        return {
          bg: 'bg-gradient-to-br from-destructive/5 via-destructive/10 to-destructive/5 border-destructive/20',
          iconBg: 'bg-destructive',
          iconGradient: 'from-destructive to-destructive/80',
          glow1: 'bg-gradient-to-br from-destructive/20 to-destructive/10',
          glow2: 'bg-gradient-to-tr from-destructive/10 to-destructive/20',
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20',
          iconBg: 'bg-primary',
          iconGradient: 'from-primary to-primary/80',
          glow1: 'bg-gradient-to-br from-primary/20 to-primary/10',
          glow2: 'bg-gradient-to-tr from-primary/10 to-primary/20',
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div ref={containerRef} className="h-full flex flex-col p-8">
      {/* Confetti Effect */}
      <ConfettiEffect trigger={testState.type === 'pass'} containerRef={containerRef} />

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-2xl mx-auto w-full">
          <div className="relative overflow-hidden p-10 rounded-2xl bg-background border border-border shadow-xl">
            {/* Decorative gradient */}
            <div
              className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-10 ${
                testState.type === 'pass' ? 'bg-green-500' : 'bg-destructive'
              }`}
            />

            <div className="relative space-y-8">
              {/* Close button at top */}
              <div className="flex justify-end -mt-2 mb-4">
                <Button onClick={onBack} variant="outline" size="sm">
                  <X className="w-4 h-4 mr-1" />
                  Close
                </Button>
              </div>

              {/* Hero Result */}
              <div className="text-center">
                <div
                  className={cn('inline-flex items-center justify-center w-20 h-20 rounded-2xl')}
                >
                  {testState.type === 'execution-error' ? (
                    <AlertCircle className="w-10 h-10 text-destructive" />
                  ) : testState.type === 'pass' ? (
                    <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-500" />
                  ) : testState.type === 'fail' ? (
                    <CircleX className="w-10 h-10 text-destructive" />
                  ) : (
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-foreground">
                    {testState.type === 'pass'
                      ? 'Everything looks good'
                      : testState.type === 'execution-error'
                        ? 'Something went wrong'
                        : testState.type === 'fail'
                          ? 'Criteria not met'
                          : 'Test completed'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {testState.type === 'execution-error'
                      ? 'The automation encountered an error during execution.'
                      : testState.type === 'fail'
                        ? 'The automation ran but did not meet success criteria.'
                        : testState.type === 'pass'
                          ? 'The automation ran and met all success criteria.'
                          : 'The automation executed without errors.'}
                  </p>
                </div>
              </div>

              {/* Error Details */}
              {testState.type === 'execution-error' && result.error && (
                <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/20 text-left">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Error Details</p>
                  <p className="text-sm leading-relaxed text-foreground">{result.error}</p>
                </div>
              )}

              {/* Sub-nav */}
              <div className="flex items-center justify-center gap-3 text-xs mb-4">
                {result.evaluationReason && actualEvaluationCriteria && (
                  <button
                    onClick={() =>
                      setActiveSection(activeSection === 'reasoning' ? null : 'reasoning')
                    }
                    className={`text-muted-foreground hover:text-foreground transition-colors ${activeSection === 'reasoning' ? 'font-medium underline underline-offset-4' : ''}`}
                  >
                    Reasoning
                  </button>
                )}
                {result.evaluationReason && actualEvaluationCriteria && (
                  <span className="text-border">|</span>
                )}
                <button
                  onClick={() => setActiveSection(activeSection === 'output' ? null : 'output')}
                  className={`text-muted-foreground hover:text-foreground transition-colors ${activeSection === 'output' ? 'font-medium underline underline-offset-4' : ''}`}
                >
                  Output
                </button>
                {result.logs && result.logs.length > 0 && (
                  <>
                    <span className="text-border">|</span>
                    <button
                      onClick={() => setActiveSection(activeSection === 'logs' ? null : 'logs')}
                      className={`text-muted-foreground hover:text-foreground transition-colors ${activeSection === 'logs' ? 'font-medium underline underline-offset-4' : ''}`}
                    >
                      Logs
                    </button>
                  </>
                )}
              </div>

              {/* Section Content - Grid for smooth height transitions */}
              <div
                className="grid transition-all duration-1000 ease-in-out"
                style={{
                  gridTemplateRows: activeSection ? '1fr' : '0fr',
                }}
              >
                <div className="overflow-hidden">
                  {activeSection === 'output' && (
                    <div className="rounded-xl overflow-y-auto max-h-80 animate-in fade-in duration-300">
                      <SyntaxHighlighter
                        language="json"
                        style={oneDark}
                        customStyle={{
                          margin: 0,
                          padding: '16px',
                          fontSize: '12px',
                          lineHeight: '1.6',
                        }}
                        showLineNumbers
                      >
                        {result.data !== undefined && result.data !== null
                          ? JSON.stringify(result.data, null, 2)
                          : result.status === 'success'
                            ? '// No output returned'
                            : '// Execution failed'}
                      </SyntaxHighlighter>
                    </div>
                  )}

                  {activeSection === 'logs' && result.logs && result.logs.length > 0 && (
                    <div className="rounded-xl overflow-y-auto max-h-80 border border-border animate-in fade-in duration-300">
                      <SyntaxHighlighter
                        language="bash"
                        style={oneDark}
                        customStyle={{
                          margin: 0,
                          padding: '16px',
                          fontSize: '12px',
                          lineHeight: '1.6',
                        }}
                        showLineNumbers
                      >
                        {result.logs.join('\n')}
                      </SyntaxHighlighter>
                    </div>
                  )}

                  {activeSection === 'reasoning' &&
                    result.evaluationReason &&
                    actualEvaluationCriteria && (
                      <div className="space-y-3 text-left animate-in fade-in duration-300">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Criteria
                          </p>
                          <p className="text-xs leading-relaxed text-foreground">
                            {actualEvaluationCriteria}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Reasoning
                          </p>
                          <p className="text-xs leading-relaxed text-foreground">
                            {result.evaluationReason}
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* AI Fix Button */}
              {testState.type === 'execution-error' && !activeSection && (
                <div className="mt-6">
                  <button
                    onClick={onLetAIFix}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Sparkles className="w-4 h-4" />
                    Let AI Fix This
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
