"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Play, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@trycompai/ui/card";

import { useTaskAutomation } from "../../../hooks/use-task-automation";
import { useSharedChatContext } from "../../../lib/chat-context";
import { EvaluationCriteriaCard } from "../../evaluation/EvaluationCriteriaCard";

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  type: "trigger" | "action" | "condition" | "output";
  iconType:
    | "start"
    | "fetch"
    | "login"
    | "check"
    | "process"
    | "filter"
    | "notify"
    | "complete"
    | "error";
}

interface Props {
  steps: WorkflowStep[];
  title: string;
  onTest?: () => void;
  integrationsUsed: {
    link: string;
  }[];
  evaluationCriteria?: string;
  automationId?: string;
}

export function UnifiedWorkflowCard({
  steps,
  title,
  onTest,
  integrationsUsed,
  evaluationCriteria,
  automationId,
}: Props) {
  const { automationIdRef } = useSharedChatContext();
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  // Use the real automation ID from ref (not "new")
  const realAutomationId =
    automationIdRef.current !== "new" ? automationIdRef.current : automationId;

  // Fetch automation data with the correct ID
  const { automation } = useTaskAutomation(realAutomationId);

  // Use live automation data for criteria, fallback to prop
  const liveCriteria = automation?.evaluationCriteria || evaluationCriteria;

  useEffect(() => {
    // Calculate total animation time: card (1s) + expansion (1s) + all steps
    const totalAnimationTime = 2500 + steps.length * 1200;

    const timer = setTimeout(() => {
      setIsAnimationComplete(true);
    }, totalAnimationTime);

    return () => clearTimeout(timer);
  }, [steps.length]);

  return (
    <Card className="bg-background border-border animate-in fade-in slide-in-from-bottom-4 mx-auto flex w-full max-w-md min-w-md flex-1 flex-col overflow-hidden rounded-2xl border shadow-md duration-1000 ease-out">
      {/* Header with integration icons */}
      <CardHeader className="p-4">
        <div className="mb-4 flex items-center gap-2">
          {integrationsUsed?.map((integration) => (
            <div
              key={`https://img.logo.dev/${integration.link}?token=pk_AZatYxV5QDSfWpRDaBxzRQ`}
            >
              <Image
                src={`https://img.logo.dev/${integration.link}?token=pk_AZatYxV5QDSfWpRDaBxzRQ`}
                alt={integration.link}
                width={20}
                height={20}
                unoptimized
              />
            </div>
          ))}
        </div>

        <CardTitle className="text-foreground text-lg font-semibold">
          {title}
        </CardTitle>
      </CardHeader>

      {/* Steps Section - Pure CSS Animation */}
      <CardContent className="m-0 p-0">
        <Card
          className="bg-background border-border w-full rounded-2xl rounded-br-none rounded-bl-none border border-x-0 border-b-0"
          style={
            {
              animation: "expand-height 1s ease-out 1.5s forwards",
              maxHeight: "0px",
              "--final-height": `${steps.length * 90}px`,
            } as React.CSSProperties
          }
        >
          <CardContent className="p-4">
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-start gap-3"
                  style={{
                    animation: `reveal-step 0.8s ease-out ${2 + index * 1.2}s forwards`,
                    opacity: 0,
                  }}
                >
                  {/* Icon column with connection */}
                  <div className="flex flex-col items-center">
                    <div
                      className="from-primary/20 to-primary/10 border-primary/30 flex h-5 w-5 items-center justify-center rounded-md border bg-gradient-to-br shadow-sm"
                      style={{
                        animation: `zoom-icon 0.5s ease-out ${2.2 + index * 1.2}s forwards`,
                        transform: "scale(0)",
                      }}
                    >
                      <Zap className="text-primary h-3 w-3" />
                    </div>
                    {/* Connection line - only show if not last step */}
                    {index < steps.length - 1 && (
                      <div
                        className="from-border to-border/50 mt-2 h-4 w-px bg-gradient-to-b"
                        style={{
                          animation: `reveal-step 0.6s ease-out ${2.4 + index * 1.2}s forwards`,
                          opacity: 0,
                        }}
                      />
                    )}
                  </div>

                  {/* Content column */}
                  <div className="flex flex-1 flex-col items-start justify-start">
                    <span className="text-foreground text-sm leading-none font-medium">
                      {step.title}
                    </span>
                    {step.description && (
                      <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </CardContent>

      {/* Evaluation Criteria Section - Show after animation */}
      {realAutomationId &&
        realAutomationId !== "new" &&
        isAnimationComplete && (
          <div className="animate-in fade-in px-4 pt-2 pb-4 duration-500">
            <div className="mx-auto max-w-[650px]">
              <EvaluationCriteriaCard
                automationId={realAutomationId}
                initialCriteria={liveCriteria}
                isAiGenerated={!!liveCriteria}
              />
            </div>
          </div>
        )}

      <div
        className={`border-border w-full rounded-b-xl border-0 border-t p-4 transition-colors duration-500 ${
          !isAnimationComplete ? "bg-blue-100" : "bg-secondary"
        }`}
      >
        {!isAnimationComplete ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            </div>
            <span className="text-sm text-blue-500">Building integration</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTest?.();
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 animate-in fade-in flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors duration-500"
          >
            <Play className="h-4 w-4" />
            Test Integration
          </button>
        )}
      </div>
    </Card>
  );
}
