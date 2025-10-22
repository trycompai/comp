'use client';

import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ArrowLeft,
  Bug,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { TestResult } from '../types';
import { ConfettiEffect } from './ConfettiEffect';

interface Props {
  isExecuting: boolean;
  result: TestResult | null;
  onLetAIFix: () => void;
  onBack: () => void;
  evaluationCriteria?: string;
}

export function TestResultsPanel({
  isExecuting,
  result,
  onLetAIFix,
  onBack,
  evaluationCriteria,
}: Props) {
  const [showLogs, setShowLogs] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [animateSuccess, setAnimateSuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      setShowLogs(false);
      setShowOutput(false);
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
    <div ref={containerRef} className="h-full flex flex-col">
      {/* Confetti Effect */}
      <ConfettiEffect trigger={testState.type === 'pass'} containerRef={containerRef} />

      {/* Header */}
      <div className={cn('relative overflow-hidden border-b', colors.bg)}>
        {(testState.type === 'pass' || testState.type === 'success') && (
          <div className="absolute inset-0 overflow-hidden">
            <div
              className={cn(
                'absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl',
                colors.glow1,
                animateSuccess && 'animate-pulse',
              )}
            />
            <div
              className={cn(
                'absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-3xl',
                colors.glow2,
              )}
            />
          </div>
        )}
        <div className="relative px-8 py-6">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'relative transition-transform duration-500',
                animateSuccess && 'animate-[bounce_1.5s_ease-in-out]',
              )}
            >
              <div className="relative">
                <div
                  className={cn('absolute inset-0 rounded-full blur-md opacity-20', colors.iconBg)}
                />
                <div
                  className={cn(
                    'relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br shadow-lg',
                    colors.iconGradient,
                  )}
                >
                  {testState.type === 'execution-error' ? (
                    <AlertCircle className="w-6 h-6 text-destructive-foreground" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-foreground">{testState.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {testState.type === 'execution-error'
                  ? 'The automation script encountered an error during execution.'
                  : testState.type === 'fail'
                    ? 'The automation ran successfully but did not meet the success criteria.'
                    : testState.type === 'pass'
                      ? 'The automation ran successfully and met all success criteria.'
                      : 'The automation executed without errors.'}
              </p>
            </div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/60 border border-border hover:bg-background/80 transition-all text-sm text-muted-foreground hover:text-foreground backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-muted/10 overflow-hidden flex flex-col">
        {/* Default Summary View */}
        {!showOutput && !showLogs && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
            <div className="max-w-md mx-auto w-full">
              {/* Delightful Result Card */}
              {evaluationCriteria && (
                <div className="mb-8">
                  <div className="relative overflow-hidden p-8 rounded-2xl bg-background border border-border shadow-lg">
                    {/* Decorative gradient */}
                    <div
                      className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-10 ${
                        testState.type === 'pass' ? 'bg-green-500' : 'bg-destructive'
                      }`}
                    />

                    <div className="relative space-y-8">
                      {/* Hero Result */}
                      <div className="text-center space-y-4">
                        <div
                          className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl`}
                        >
                          <CheckCircle2
                            className={`w-10 h-10 ${testState.type === 'pass' ? 'text-green-600 dark:text-green-500' : 'text-destructive'}`}
                          />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {testState.type === 'pass'
                              ? 'Everything looks good'
                              : 'Did not pass the evaluation'}
                          </h3>
                        </div>
                      </div>

                      {/* Mini Journey */}
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span>Ran</span>
                        </div>
                        <div className="w-8 h-px bg-border" />
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span>Evaluated</span>
                        </div>
                        <div className="w-8 h-px bg-border" />
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${testState.type === 'pass' ? 'bg-green-500' : 'bg-destructive'}`}
                          />
                          <span className={testState.type === 'pass' ? '' : ''}>
                            {testState.type === 'pass' ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                      </div>

                      {/* Expandable Technical Details */}
                      {result.evaluationReason && (
                        <details className="group">
                          <summary className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer list-none">
                            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                            <span>Reasoning</span>
                          </summary>
                          <div className="mt-4 pt-4 border-t border-border space-y-3 text-left">
                            <div>
                              <p className="text-xs font-semibold">Criteria</p>
                              <p className="text-xs leading-relaxed text-foreground">
                                {evaluationCriteria}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold">Reasoning</p>
                              <p className="text-xs leading-relaxed text-foreground">
                                {result.evaluationReason}
                              </p>
                            </div>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Execution Error (if execution failed) */}
              {testState.type === 'execution-error' && result.error && (
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Error Details
                    </h4>
                  </div>
                  <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/20">
                    <p className="text-sm leading-relaxed text-foreground">{result.error}</p>
                  </div>
                </div>
              )}

              {/* Summary (if no evaluation reason) */}
              {!result.evaluationReason && result.summary && (
                <div className="mb-6 p-4 bg-muted/50 rounded-xl border border-border">
                  <p className="text-sm leading-relaxed text-foreground">{result.summary}</p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowOutput(true)}
                  className="group flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/30"
                >
                  <Terminal className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-primary">View Output</span>
                </button>

                {result.logs && result.logs.length > 0 && (
                  <button
                    onClick={() => setShowLogs(true)}
                    className="group flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/30"
                  >
                    <Bug className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium text-primary">View Logs</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Detail Views - Redesigned as expandable sections */}
        {(showOutput || showLogs) && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Navigation Header */}
            <div className="flex-shrink-0 px-6 py-4 bg-background/30 border-b">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setShowOutput(false);
                    setShowLogs(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-sm text-primary font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Summary
                </button>
                <div className="h-4 w-px bg-border" />
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {showOutput ? (
                    <>
                      <Terminal className="w-4 h-4 text-primary" />
                      Execution Output
                    </>
                  ) : (
                    <>
                      <Bug className="w-4 h-4 text-primary" />
                      System Logs
                    </>
                  )}
                </h4>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Output Content */}
              {showOutput && (
                <pre className="p-4 bg-primary/5 rounded-lg text-xs leading-relaxed overflow-x-auto font-mono border border-primary/10 h-full">
                  {result.data !== undefined && result.data !== null
                    ? JSON.stringify(result.data, null, 2)
                    : result.status === 'success'
                      ? '// No output returned'
                      : '// Execution failed'}
                </pre>
              )}

              {/* Logs Content */}
              {showLogs && result.logs && result.logs.length > 0 && (
                <pre className="p-4 bg-primary/5 rounded-lg text-xs leading-relaxed overflow-x-auto font-mono text-muted-foreground border border-primary/10 h-full">
                  {result.logs.join('\n')}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>

      {testState.type === 'execution-error' && (
        <div className="px-8 pb-6 pt-2">
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
  );
}
