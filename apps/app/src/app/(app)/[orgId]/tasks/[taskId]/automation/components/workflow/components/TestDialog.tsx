'use client';

import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@comp/ui/dialog';
import { AlertCircle, Bug, CheckCircle2, Loader2, Sparkles, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { TestResult } from '../types';
import { ConfettiEffect } from './ConfettiEffect';

interface Props {
  open: boolean;
  isExecuting: boolean;
  result: TestResult | null;
  onClose: () => void;
  onLetAIFix: () => void;
}

export function TestDialog({ open, isExecuting, result, onClose, onLetAIFix }: Props) {
  const [showLogs, setShowLogs] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [animateSuccess, setAnimateSuccess] = useState(false);
  // Store the display result to prevent flashing during close
  const [displayResult, setDisplayResult] = useState<TestResult | null>(null);
  const [displayIsExecuting, setDisplayIsExecuting] = useState(false);

  // Update display states only when dialog is open
  useEffect(() => {
    if (open) {
      setDisplayResult(result);
      setDisplayIsExecuting(isExecuting);
    }
  }, [open, result, isExecuting]);

  useEffect(() => {
    if (displayResult?.status === 'success') {
      setAnimateSuccess(true);
      // Wait for bounce animation to complete (bounce animation is typically 1s)
      const timer = setTimeout(() => setAnimateSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [displayResult?.status]);

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setShowLogs(false);
      setShowOutput(false);
      setAnimateSuccess(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* Confetti Effect */}
      <ConfettiEffect trigger={displayResult?.status === 'success' && open} />
      <DialogContent className="w-[720px] max-w-[720px] h-[560px] overflow-hidden flex flex-col p-0">
        {displayIsExecuting && !displayResult ? (
          <div className="flex-1 flex flex-col">
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
              <h3 className="mt-6 text-lg font-semibold text-foreground">
                Running your automation
              </h3>
              <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                We're testing your script in a secure environment. This usually takes 15-30 seconds.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'relative overflow-hidden border-b',
                displayResult?.status === 'success'
                  ? 'bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20'
                  : 'bg-gradient-to-br from-destructive/5 via-destructive/10 to-destructive/5 border-destructive/20',
              )}
            >
              {displayResult?.status === 'success' && (
                <div className="absolute inset-0 overflow-hidden">
                  <div
                    className={cn(
                      'absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 blur-3xl',
                      animateSuccess && 'animate-pulse',
                    )}
                  />
                  <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-gradient-to-tr from-primary/10 to-primary/20 blur-3xl" />
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
                    {displayResult?.status === 'success' ? (
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary rounded-full blur-md opacity-20" />
                        <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                          <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute inset-0 bg-destructive rounded-full blur-md opacity-20" />
                        <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-destructive to-destructive/80 shadow-lg">
                          <AlertCircle className="w-6 h-6 text-destructive-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground">
                      {displayResult?.status === 'success' ? '🎉 Success!' : '🚨 Error!'}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {displayResult?.status === 'success'
                        ? 'Your automation ran successfully without any errors.'
                        : 'There was an issue running your automation. Please check the output and logs below to understand what went wrong.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-muted/10 overflow-hidden flex flex-col">
              {/* Default Summary View */}
              {!showOutput && !showLogs && (
                <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
                  <div className="text-center max-w-md">
                    <h3 className="text-lg font-semibold mb-4">
                      {displayResult?.status === 'success'
                        ? 'Test completed successfully'
                        : 'Test failed'}
                    </h3>

                    {/* Show summary or error here if available */}
                    {(displayResult?.summary || displayResult?.error) && (
                      <div className="mb-6 p-4 bg-muted/50 rounded-lg text-sm">
                        {displayResult?.summary || displayResult?.error}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground mb-8">
                      {displayResult?.status === 'success'
                        ? 'View the output to see the results.'
                        : 'Check the output and logs below to understand what went wrong.'}
                    </p>

                    {/* Quick Actions */}
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => setShowOutput(true)}
                        className="group flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/30"
                      >
                        <Terminal className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-primary">View Output</span>
                      </button>

                      {displayResult?.logs && displayResult.logs.length > 0 && (
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

              {/* Tab Navigation - Always visible */}
              {(showOutput || showLogs) && (
                <div className="flex-shrink-0 border-b bg-background/50 px-6 py-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setShowOutput(false);
                        setShowLogs(false);
                      }}
                      className="px-4 py-2 text-sm font-medium rounded-t-lg transition-all text-muted-foreground hover:text-primary hover:bg-primary/5"
                    >
                      Summary
                    </button>
                    <button
                      onClick={() => {
                        setShowOutput(true);
                        setShowLogs(false);
                      }}
                      className={cn(
                        'px-4 py-2 text-sm font-medium rounded-t-lg transition-all',
                        showOutput
                          ? 'bg-primary/10 text-primary border-t border-x border-primary/20'
                          : 'text-muted-foreground hover:text-primary hover:bg-primary/5',
                      )}
                    >
                      Output
                    </button>
                    {displayResult?.logs && displayResult.logs.length > 0 && (
                      <button
                        onClick={() => {
                          setShowOutput(false);
                          setShowLogs(true);
                        }}
                        className={cn(
                          'px-4 py-2 text-sm font-medium rounded-t-lg transition-all',
                          showLogs
                            ? 'bg-primary/10 text-primary border-t border-x border-primary/20'
                            : 'text-muted-foreground hover:text-primary hover:bg-primary/5',
                        )}
                      >
                        Logs
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Content */}
              {(showOutput || showLogs) && (
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Output Tab */}
                  {showOutput && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-primary" />
                        Execution Output
                      </h4>
                      <pre className="p-4 bg-primary/5 rounded-lg text-xs leading-relaxed overflow-x-auto font-mono border border-primary/10">
                        {displayResult?.data !== undefined && displayResult?.data !== null
                          ? JSON.stringify(displayResult.data, null, 2)
                          : displayResult?.status === 'success'
                            ? '// No output returned'
                            : '// Execution failed'}
                      </pre>
                    </div>
                  )}

                  {/* Logs Tab */}
                  {showLogs && displayResult?.logs && displayResult.logs.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Bug className="w-4 h-4 text-primary" />
                        System Logs
                      </h4>
                      <pre className="p-4 bg-primary/5 rounded-lg text-xs leading-relaxed overflow-x-auto font-mono text-muted-foreground border border-primary/10">
                        {displayResult.logs.join('\n')}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {displayResult?.status === 'error' && (
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
