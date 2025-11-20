"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  CircleX,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

import { Button } from "@trycompai/ui/button";

import type { TestResult } from "../types";
import { useTaskAutomation } from "../../../hooks";
import { useSharedChatContext } from "../../../lib";
import { ConfettiEffect } from "./ConfettiEffect";

interface Props {
  isExecuting: boolean;
  result: TestResult | null;
  onLetAIFix: () => void;
  onBack: () => void;
  evaluationCriteria?: string;
}

type ActiveSection = "output" | "logs" | "reasoning" | null;

export function TestResultsPanel({
  isExecuting,
  result,
  onLetAIFix,
  onBack,
  evaluationCriteria,
}: Props) {
  const [activeSection, setActiveSection] =
    useState<ActiveSection>("reasoning");
  const [animateSuccess, setAnimateSuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { automationIdRef } = useSharedChatContext();
  const { automation } = useTaskAutomation(automationIdRef.current);

  const actualEvaluationCriteria =
    automation?.evaluationCriteria || evaluationCriteria;

  // Determine overall test state
  const getTestState = () => {
    if (!result) return null;

    // Execution error - script failed to run
    if (result.status === "error") {
      return {
        type: "execution-error",
        title: "🚨 Execution Error",
        color: "destructive",
      } as const;
    }

    // Script ran successfully
    if (result.status === "success") {
      // Check evaluation if available
      if (result.evaluationStatus === "pass") {
        return {
          type: "pass",
          title: "Test Passed",
          color: "success",
        } as const;
      } else if (result.evaluationStatus === "fail") {
        return {
          type: "fail",
          title: "Test Failed",
          color: "destructive",
        } as const;
      }
      // No evaluation - just show execution success
      return {
        type: "success",
        title: "🎉 Execution Success",
        color: "primary",
      } as const;
    }

    return null;
  };

  const testState = getTestState();

  useEffect(() => {
    if (testState?.type === "pass" || testState?.type === "success") {
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
      <div className="flex h-full flex-col">
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
    );
  }

  if (!result) return null;

  if (!testState) return null;

  const getColorClasses = () => {
    switch (testState.color) {
      case "success":
        return {
          bg: "bg-gradient-to-br from-green-500/5 via-green-500/10 to-green-500/5 border-green-500/20",
          iconBg: "bg-green-500",
          iconGradient: "from-green-500 to-green-600",
          glow1: "bg-gradient-to-br from-green-500/20 to-green-500/10",
          glow2: "bg-gradient-to-tr from-green-500/10 to-green-500/20",
        };
      case "destructive":
        return {
          bg: "bg-gradient-to-br from-destructive/5 via-destructive/10 to-destructive/5 border-destructive/20",
          iconBg: "bg-destructive",
          iconGradient: "from-destructive to-destructive/80",
          glow1: "bg-gradient-to-br from-destructive/20 to-destructive/10",
          glow2: "bg-gradient-to-tr from-destructive/10 to-destructive/20",
        };
      default:
        return {
          bg: "bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20",
          iconBg: "bg-primary",
          iconGradient: "from-primary to-primary/80",
          glow1: "bg-gradient-to-br from-primary/20 to-primary/10",
          glow2: "bg-gradient-to-tr from-primary/10 to-primary/20",
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div ref={containerRef} className="flex h-full flex-col p-8">
      {/* Confetti Effect */}
      <ConfettiEffect
        trigger={testState.type === "pass"}
        containerRef={containerRef}
      />

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="mx-auto w-full max-w-2xl">
          <div className="bg-background border-border relative overflow-hidden rounded-2xl border p-10 shadow-xl">
            {/* Decorative gradient */}
            <div
              className={`absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-10 blur-3xl ${
                testState.type === "pass" ? "bg-green-500" : "bg-destructive"
              }`}
            />

            <div className="relative space-y-8">
              {/* Close button at top */}
              <div className="-mt-2 mb-4 flex justify-end">
                <Button onClick={onBack} variant="outline" size="sm">
                  <X className="mr-1 h-4 w-4" />
                  Close
                </Button>
              </div>

              {/* Hero Result */}
              <div className="text-center">
                <div
                  className={cn(
                    "inline-flex h-20 w-20 items-center justify-center rounded-2xl",
                  )}
                >
                  {testState.type === "execution-error" ? (
                    <AlertCircle className="text-destructive h-10 w-10" />
                  ) : testState.type === "pass" ? (
                    <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
                  ) : testState.type === "fail" ? (
                    <CircleX className="text-destructive h-10 w-10" />
                  ) : (
                    <CheckCircle2 className="text-primary h-10 w-10" />
                  )}
                </div>
                <div>
                  <h3 className="text-foreground text-2xl font-semibold">
                    {testState.type === "pass"
                      ? "Everything looks good"
                      : testState.type === "execution-error"
                        ? "Something went wrong"
                        : testState.type === "fail"
                          ? "Criteria not met"
                          : "Test completed"}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {testState.type === "execution-error"
                      ? "The automation encountered an error during execution."
                      : testState.type === "fail"
                        ? "The automation ran but did not meet success criteria."
                        : testState.type === "pass"
                          ? "The automation ran and met all success criteria."
                          : "The automation executed without errors."}
                  </p>
                </div>
              </div>

              {/* Error Details */}
              {testState.type === "execution-error" && result.error && (
                <div className="bg-destructive/5 border-destructive/20 rounded-xl border p-4 text-left">
                  <p className="text-muted-foreground mb-2 text-xs font-semibold">
                    Error Details
                  </p>
                  <p className="text-foreground text-sm leading-relaxed">
                    {result.error}
                  </p>
                </div>
              )}

              {/* Sub-nav */}
              <div className="mb-4 flex items-center justify-center gap-3 text-xs">
                {result.evaluationReason && actualEvaluationCriteria && (
                  <button
                    onClick={() =>
                      setActiveSection(
                        activeSection === "reasoning" ? null : "reasoning",
                      )
                    }
                    className={`text-muted-foreground hover:text-foreground transition-colors ${activeSection === "reasoning" ? "font-medium underline underline-offset-4" : ""}`}
                  >
                    Reasoning
                  </button>
                )}
                {result.evaluationReason && actualEvaluationCriteria && (
                  <span className="text-border">|</span>
                )}
                <button
                  onClick={() =>
                    setActiveSection(
                      activeSection === "output" ? null : "output",
                    )
                  }
                  className={`text-muted-foreground hover:text-foreground transition-colors ${activeSection === "output" ? "font-medium underline underline-offset-4" : ""}`}
                >
                  Output
                </button>
                {result.logs && result.logs.length > 0 && (
                  <>
                    <span className="text-border">|</span>
                    <button
                      onClick={() =>
                        setActiveSection(
                          activeSection === "logs" ? null : "logs",
                        )
                      }
                      className={`text-muted-foreground hover:text-foreground transition-colors ${activeSection === "logs" ? "font-medium underline underline-offset-4" : ""}`}
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
                  gridTemplateRows: activeSection ? "1fr" : "0fr",
                }}
              >
                <div className="overflow-hidden">
                  {activeSection === "output" && (
                    <div className="animate-in fade-in max-h-80 overflow-y-auto rounded-xl duration-300">
                      <SyntaxHighlighter
                        language="json"
                        style={oneDark}
                        customStyle={{
                          margin: 0,
                          padding: "16px",
                          fontSize: "12px",
                          lineHeight: "1.6",
                        }}
                        showLineNumbers
                      >
                        {result.data !== undefined && result.data !== null
                          ? JSON.stringify(result.data, null, 2)
                          : result.status === "success"
                            ? "// No output returned"
                            : "// Execution failed"}
                      </SyntaxHighlighter>
                    </div>
                  )}

                  {activeSection === "logs" &&
                    result.logs &&
                    result.logs.length > 0 && (
                      <div className="border-border animate-in fade-in max-h-80 overflow-y-auto rounded-xl border duration-300">
                        <SyntaxHighlighter
                          language="bash"
                          style={oneDark}
                          customStyle={{
                            margin: 0,
                            padding: "16px",
                            fontSize: "12px",
                            lineHeight: "1.6",
                          }}
                          showLineNumbers
                        >
                          {result.logs.join("\n")}
                        </SyntaxHighlighter>
                      </div>
                    )}

                  {activeSection === "reasoning" &&
                    result.evaluationReason &&
                    actualEvaluationCriteria && (
                      <div className="animate-in fade-in space-y-3 text-left duration-300">
                        <div>
                          <p className="text-muted-foreground mb-1 text-xs font-semibold">
                            Criteria
                          </p>
                          <p className="text-foreground text-xs leading-relaxed">
                            {actualEvaluationCriteria}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1 text-xs font-semibold">
                            Reasoning
                          </p>
                          <p className="text-foreground text-xs leading-relaxed">
                            {result.evaluationReason}
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* AI Fix Button */}
              {testState.type === "execution-error" && !activeSection && (
                <div className="mt-6">
                  <button
                    onClick={onLetAIFix}
                    className="from-primary to-primary/80 text-primary-foreground flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r px-6 py-3 font-medium shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                  >
                    <Sparkles className="h-4 w-4" />
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
