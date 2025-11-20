"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Loader2,
  Sparkles,
  Terminal,
} from "lucide-react";

import { Dialog, DialogContent } from "@trycompai/ui/dialog";

import type { TestResult } from "../types";
import { ConfettiEffect } from "./ConfettiEffect";

interface Props {
  open: boolean;
  isExecuting: boolean;
  result: TestResult | null;
  onClose: () => void;
  onLetAIFix: () => void;
}

export function TestDialog({
  open,
  isExecuting,
  result,
  onClose,
  onLetAIFix,
}: Props) {
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
    if (displayResult?.status === "success") {
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
      <ConfettiEffect trigger={displayResult?.status === "success" && open} />
      <DialogContent className="flex h-[560px] w-[720px] max-w-[720px] flex-col overflow-hidden p-0">
        {displayIsExecuting && !displayResult ? (
          <div className="flex flex-1 flex-col">
            <div className="from-primary/40 via-primary to-primary/40 h-1.5 animate-pulse bg-gradient-to-r" />
            <div className="flex flex-1 flex-col items-center justify-center px-8">
              <div className="relative">
                <div className="absolute inset-0 animate-ping">
                  <div className="bg-primary/30 h-20 w-20 rounded-full" />
                </div>
                <div className="from-primary/20 to-primary/10 ring-primary/20 relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ring-2 backdrop-blur">
                  <Loader2 className="text-primary h-8 w-8 animate-spin" />
                </div>
              </div>
              <h3 className="text-foreground mt-6 text-lg font-semibold">
                Running your automation
              </h3>
              <p className="text-muted-foreground mt-2 max-w-sm text-center text-sm">
                We're testing your script in a secure environment. This usually
                takes 15-30 seconds.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "relative overflow-hidden border-b",
                displayResult?.status === "success"
                  ? "from-primary/5 via-primary/10 to-primary/5 border-primary/20 bg-gradient-to-br"
                  : "from-destructive/5 via-destructive/10 to-destructive/5 border-destructive/20 bg-gradient-to-br",
              )}
            >
              {displayResult?.status === "success" && (
                <div className="absolute inset-0 overflow-hidden">
                  <div
                    className={cn(
                      "from-primary/20 to-primary/10 absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br blur-3xl",
                      animateSuccess && "animate-pulse",
                    )}
                  />
                  <div className="from-primary/10 to-primary/20 absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-tr blur-3xl" />
                </div>
              )}
              <div className="relative px-8 py-6">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "relative transition-transform duration-500",
                      animateSuccess && "animate-[bounce_1.5s_ease-in-out]",
                    )}
                  >
                    {displayResult?.status === "success" ? (
                      <div className="relative">
                        <div className="bg-primary absolute inset-0 rounded-full opacity-20 blur-md" />
                        <div className="from-primary to-primary/80 relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br shadow-lg">
                          <CheckCircle2 className="text-primary-foreground h-6 w-6" />
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="bg-destructive absolute inset-0 rounded-full opacity-20 blur-md" />
                        <div className="from-destructive to-destructive/80 relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br shadow-lg">
                          <AlertCircle className="text-destructive-foreground h-6 w-6" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-foreground text-xl font-semibold">
                      {displayResult?.status === "success"
                        ? "🎉 Success!"
                        : "🚨 Error!"}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {displayResult?.status === "success"
                        ? "Your automation ran successfully without any errors."
                        : "There was an issue running your automation. Please check the output and logs below to understand what went wrong."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/10 flex flex-1 flex-col overflow-hidden">
              {/* Default Summary View */}
              {!showOutput && !showLogs && (
                <div className="flex flex-1 flex-col items-center justify-center px-8 py-12">
                  <div className="max-w-md text-center">
                    <h3 className="mb-4 text-lg font-semibold">
                      {displayResult?.status === "success"
                        ? "Test completed successfully"
                        : "Test failed"}
                    </h3>

                    {/* Show summary or error here if available */}
                    {(displayResult?.summary || displayResult?.error) && (
                      <div className="bg-muted/50 mb-6 rounded-lg p-4 text-sm">
                        {displayResult?.summary || displayResult?.error}
                      </div>
                    )}

                    <p className="text-muted-foreground mb-8 text-sm">
                      {displayResult?.status === "success"
                        ? "View the output to see the results."
                        : "Check the output and logs below to understand what went wrong."}
                    </p>

                    {/* Quick Actions */}
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setShowOutput(true)}
                        className="group bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/30 flex items-center gap-2 rounded-lg border px-4 py-2.5 transition-all"
                      >
                        <Terminal className="text-primary/70 group-hover:text-primary h-4 w-4 transition-colors" />
                        <span className="text-primary text-sm font-medium">
                          View Output
                        </span>
                      </button>

                      {displayResult?.logs && displayResult.logs.length > 0 && (
                        <button
                          onClick={() => setShowLogs(true)}
                          className="group bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/30 flex items-center gap-2 rounded-lg border px-4 py-2.5 transition-all"
                        >
                          <Bug className="text-primary/70 group-hover:text-primary h-4 w-4 transition-colors" />
                          <span className="text-primary text-sm font-medium">
                            View Logs
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Navigation - Always visible */}
              {(showOutput || showLogs) && (
                <div className="bg-background/50 flex-shrink-0 border-b px-6 py-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setShowOutput(false);
                        setShowLogs(false);
                      }}
                      className="text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-t-lg px-4 py-2 text-sm font-medium transition-all"
                    >
                      Summary
                    </button>
                    <button
                      onClick={() => {
                        setShowOutput(true);
                        setShowLogs(false);
                      }}
                      className={cn(
                        "rounded-t-lg px-4 py-2 text-sm font-medium transition-all",
                        showOutput
                          ? "bg-primary/10 text-primary border-primary/20 border-x border-t"
                          : "text-muted-foreground hover:text-primary hover:bg-primary/5",
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
                          "rounded-t-lg px-4 py-2 text-sm font-medium transition-all",
                          showLogs
                            ? "bg-primary/10 text-primary border-primary/20 border-x border-t"
                            : "text-muted-foreground hover:text-primary hover:bg-primary/5",
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
                      <h4 className="flex items-center gap-2 text-sm font-semibold">
                        <Terminal className="text-primary h-4 w-4" />
                        Execution Output
                      </h4>
                      <pre className="bg-primary/5 border-primary/10 overflow-x-auto rounded-lg border p-4 font-mono text-xs leading-relaxed">
                        {displayResult?.data !== undefined &&
                        displayResult?.data !== null
                          ? JSON.stringify(displayResult.data, null, 2)
                          : displayResult?.status === "success"
                            ? "// No output returned"
                            : "// Execution failed"}
                      </pre>
                    </div>
                  )}

                  {/* Logs Tab */}
                  {showLogs &&
                    displayResult?.logs &&
                    displayResult.logs.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="flex items-center gap-2 text-sm font-semibold">
                          <Bug className="text-primary h-4 w-4" />
                          System Logs
                        </h4>
                        <pre className="bg-primary/5 text-muted-foreground border-primary/10 overflow-x-auto rounded-lg border p-4 font-mono text-xs leading-relaxed">
                          {displayResult.logs.join("\n")}
                        </pre>
                      </div>
                    )}
                </div>
              )}
            </div>

            {displayResult?.status === "error" && (
              <div className="px-8 pt-2 pb-6">
                <button
                  onClick={onLetAIFix}
                  className="from-primary to-primary/80 text-primary-foreground flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r px-6 py-3 font-medium shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4" />
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
