"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  Database,
  FileText,
  Globe,
  Key,
  Shield,
  Webhook,
  Zap,
} from "lucide-react";

import { Card, CardContent } from "@trycompai/ui/card";

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
  step: WorkflowStep;
  index: number;
  showConnection: boolean;
}

function getIconForType(iconType: WorkflowStep["iconType"]): React.ReactNode {
  switch (iconType) {
    case "start":
      return <Zap className="h-5 w-5" />;
    case "fetch":
      return <Globe className="h-5 w-5" />;
    case "login":
      return <Key className="h-5 w-5" />;
    case "check":
      return <Shield className="h-5 w-5" />;
    case "process":
      return <FileText className="h-5 w-5" />;
    case "filter":
      return <Database className="h-5 w-5" />;
    case "notify":
      return <Webhook className="h-5 w-5" />;
    case "complete":
      return <CheckCircle2 className="h-5 w-5" />;
    case "error":
      return <AlertCircle className="h-5 w-5" />;
    default:
      return <Code2 className="h-5 w-5" />;
  }
}

export function WorkflowStepCard({ step, index, showConnection }: Props) {
  return (
    <div className="relative">
      {/* Connection line */}
      {showConnection && (
        <div className="absolute -top-6 left-6 flex flex-col items-center">
          <div className="via-border/50 to-border/50 h-6 w-px bg-gradient-to-b from-transparent" />
        </div>
      )}

      {/* Step card */}
      <div className="group relative">
        {/* Subtle glow effect */}
        <div className="from-primary/0 via-primary/5 to-primary/0 absolute -inset-px rounded-xl bg-gradient-to-r opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <Card className="bg-background relative overflow-hidden border-0 shadow-sm transition-all duration-300 hover:shadow-md">
          <CardContent className="relative p-5">
            <div className="flex items-center gap-4">
              {/* Icon container */}
              <div className="relative">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                    "shadow-sm group-hover:shadow-md",
                    step.type === "trigger" &&
                      "from-primary/20 to-primary/10 text-primary bg-gradient-to-br",
                    step.type === "action" &&
                      "bg-gradient-to-br from-blue-500/20 to-blue-500/10 text-blue-600 dark:text-blue-400",
                    step.type === "condition" &&
                      "bg-gradient-to-br from-amber-500/20 to-amber-500/10 text-amber-600 dark:text-amber-400",
                    step.type === "output" &&
                      "bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {getIconForType(step.iconType)}
                </div>

                {/* Step number badge */}
                <div className="bg-background border-border/50 absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border shadow-md">
                  <span className="text-foreground/70 text-[11px] font-semibold">
                    {index + 1}
                  </span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-3">
                  <h3 className="text-foreground text-sm font-semibold">
                    {step.title}
                  </h3>
                  {/* Type indicator */}
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      step.type === "trigger" && "bg-primary/10 text-primary",
                      step.type === "action" &&
                        "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                      step.type === "condition" &&
                        "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                      step.type === "output" &&
                        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                    {step.type}
                  </div>
                </div>
                <p className="text-muted-foreground text-[13px] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
