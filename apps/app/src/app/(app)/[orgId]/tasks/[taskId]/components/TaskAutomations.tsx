"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Loader2,
  Plus,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { EvidenceAutomation, EvidenceAutomationRun } from "@trycompai/db";
import { Button } from "@trycompai/ui/button";
import { Separator } from "@trycompai/ui/separator";

import { useTaskAutomations } from "../hooks/use-task-automations";

type AutomationWithLatestRun = EvidenceAutomation & {
  runs: EvidenceAutomationRun[];
};

export const TaskAutomations = ({
  automations,
}: {
  automations: AutomationWithLatestRun[];
}) => {
  const { orgId, taskId } = useParams<{ orgId: string; taskId: string }>();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const { mutate: mutateAutomations } = useTaskAutomations();

  const handleCreateAutomation = async () => {
    // Redirect to automation builder with ephemeral mode
    // The automation will only be created once the user sends their first message
    router.push(`/${orgId}/tasks/${taskId}/automation/new`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Brain className="text-primary h-3.5 w-3.5" />
        <h3 className="text-foreground text-[10px] font-semibold tracking-[0.15em] uppercase">
          Automated Evidence Collection
        </h3>
      </div>

      <div>
        {automations.length === 0 ? (
          <AutomationEmptyState
            onCreate={handleCreateAutomation}
            isCreating={isCreating}
          />
        ) : (
          <div className="space-y-4">
            {/* Automation Metrics Summary */}
            {(() => {
              const enabledAutomations = automations.filter((a) => a.isEnabled);
              const allRuns = automations.flatMap((a) =>
                a.runs.filter((r) => r.version !== null),
              );

              const totalRuns = allRuns.length;
              const successfulRuns = allRuns.filter(
                (r) =>
                  r.status === "completed" &&
                  r.success &&
                  r.evaluationStatus !== "fail",
              ).length;
              const failedRuns = allRuns.filter(
                (r) => r.status === "failed" || r.evaluationStatus === "fail",
              ).length;
              const runningRuns = allRuns.filter(
                (r) => r.status === "running",
              ).length;

              const successRate =
                totalRuns > 0
                  ? Math.round((successfulRuns / totalRuns) * 100)
                  : 0;

              const latestRun = allRuns.sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )[0];

              const healthyCount = automations.filter((a) => {
                if (!a.isEnabled) return false;
                const run = a.runs.find((r) => r.version !== null);
                return (
                  run &&
                  run.status === "completed" &&
                  run.success &&
                  run.evaluationStatus !== "fail"
                );
              }).length;

              const errorCount = automations.filter((a) => {
                if (!a.isEnabled) return false;
                const run = a.runs.find((r) => r.version !== null);
                return (
                  run &&
                  (run.status === "failed" || run.evaluationStatus === "fail")
                );
              }).length;

              return (
                <div className="border-border/50 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {/* Total Runs */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="text-muted-foreground h-3.5 w-3.5" />
                        <span className="text-muted-foreground text-[9px] font-medium tracking-[0.1em] uppercase">
                          Total Runs
                        </span>
                      </div>
                      <div className="text-foreground text-xl font-semibold tabular-nums">
                        {totalRuns}
                      </div>
                    </div>

                    {/* Success Rate */}
                    {totalRuns > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="text-primary h-3.5 w-3.5" />
                          <span className="text-muted-foreground text-[9px] font-medium tracking-[0.1em] uppercase">
                            Success Rate
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-foreground text-xl font-semibold tabular-nums">
                            {successRate}%
                          </div>
                          <div className="bg-muted/50 h-1 max-w-[60px] flex-1 overflow-hidden rounded-full">
                            <div
                              className="bg-primary h-full transition-all duration-500"
                              style={{ width: `${successRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Running */}
                    {runningRuns > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                          <span className="text-muted-foreground text-[9px] font-medium tracking-[0.1em] uppercase">
                            Active
                          </span>
                        </div>
                        <div className="text-xl font-semibold text-blue-500 tabular-nums">
                          {runningRuns}
                        </div>
                      </div>
                    )}

                    {/* Health Status */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {errorCount > 0 ? (
                          <XCircle className="text-destructive h-3.5 w-3.5" />
                        ) : healthyCount > 0 ? (
                          <CheckCircle2 className="text-primary h-3.5 w-3.5" />
                        ) : (
                          <div className="bg-muted-foreground/30 h-3.5 w-3.5 rounded-full" />
                        )}
                        <span className="text-muted-foreground text-[9px] font-medium tracking-[0.1em] uppercase">
                          Health
                        </span>
                      </div>
                      <div className="text-foreground text-xl font-semibold tabular-nums">
                        {healthyCount > 0 && (
                          <span className="text-primary">{healthyCount}</span>
                        )}
                        {healthyCount > 0 && errorCount > 0 && (
                          <span className="text-muted-foreground/50 mx-1">
                            /
                          </span>
                        )}
                        {errorCount > 0 && (
                          <span className="text-destructive">{errorCount}</span>
                        )}
                        {healthyCount === 0 && errorCount === 0 && (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1">
              {automations.map((automation, idx) => {
                // Show only the latest version run (ignore draft runs)
                const latestVersionRun = automation.runs.find(
                  (run) => run.version !== null,
                );

                const runStatus = latestVersionRun?.status;
                const lastRan = latestVersionRun?.createdAt
                  ? formatDistanceToNow(new Date(latestVersionRun.createdAt), {
                      addSuffix: true,
                    })
                  : null;
                const runVersion = latestVersionRun?.version;

                // Determine dot color: red if failed, primary if enabled, gray if disabled
                const hasFailed =
                  latestVersionRun &&
                  (runStatus === "failed" ||
                    latestVersionRun.evaluationStatus === "fail");
                const dotColor = hasFailed
                  ? "bg-destructive"
                  : automation.isEnabled
                    ? "bg-primary"
                    : "bg-muted-foreground";

                return (
                  <div key={automation.id}>
                    {idx > 0 && <Separator className="my-2" />}
                    <Link
                      href={`/${orgId}/tasks/${taskId}/automations/${automation.id}/overview`}
                      className={cn(
                        "flex flex-row items-center justify-between px-1 py-2.5",
                        "hover:bg-muted/30 transition-colors",
                        "group cursor-pointer",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-2 w-2 flex-shrink-0 rounded-full ${dotColor} ${automation.isEnabled && !hasFailed ? "animate-pulse" : ""}`}
                          />
                          <p className="text-foreground text-sm font-semibold tracking-tight">
                            {automation.name}
                          </p>
                        </div>
                        {latestVersionRun && lastRan ? (
                          <p className="text-muted-foreground/80 mt-1 ml-5 font-mono text-xs tabular-nums">
                            Last ran {lastRan} (v{runVersion})
                          </p>
                        ) : (
                          <p className="text-muted-foreground/80 mt-1 ml-5 text-xs">
                            No published runs yet
                          </p>
                        )}
                      </div>
                      <ArrowRight className="text-muted-foreground group-hover:text-foreground h-4 w-4 flex-shrink-0 transition-colors" />
                    </Link>
                  </div>
                );
              })}
            </div>

            {automations.length > 0 && <Separator className="my-3" />}

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={handleCreateAutomation}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Create Another
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Animated empty state component
function AutomationEmptyState({
  onCreate,
  isCreating,
}: {
  onCreate: () => void;
  isCreating: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let time = 0;
    const animate = () => {
      time += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Primary color: hsl(165, 100%, 15%) = rgb(0, 77, 64)
      const primaryR = 0;
      const primaryG = 77;
      const primaryB = 64;

      // Subtle flowing lines - reduced intensity
      ctx.strokeStyle = `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.06)`;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const y = (canvas.height / 4) * (i + 1);
        const wave = Math.sin(time + i) * 10;
        ctx.moveTo(0, y + wave);
        for (let x = 0; x < canvas.width; x += 15) {
          const waveY =
            Math.sin((x / canvas.width) * Math.PI * 2 + time + i) * 8;
          ctx.lineTo(x, y + wave + waveY);
        }
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      className="border-t-primary/20 bg-primary/2 group hover:border-t-primary/30 hover:bg-primary/4 relative cursor-pointer overflow-hidden border-t-2 px-6 py-8 transition-all"
      onClick={onCreate}
    >
      {/* Very subtle animated background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full opacity-10"
        style={{ mixBlendMode: "multiply" }}
      />

      <div className="relative z-10 space-y-3 text-center">
        {/* Icon - Brain for agentic AI */}
        <div className="inline-flex">
          <div className="bg-primary/8 group-hover:bg-primary/12 mx-auto flex h-12 w-12 items-center justify-center rounded-md transition-colors">
            <Brain className="text-primary h-6 w-6" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-foreground text-base font-semibold tracking-tight">
            Automate This Task
          </h4>
          <p className="text-muted-foreground mx-auto max-w-sm text-xs leading-relaxed">
            Launch an AI agent that continuously collects, verifies, and
            refreshes evidence for this requirement
          </p>
        </div>

        <Button
          onClick={onCreate}
          disabled={isCreating}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-4 font-medium"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Launching...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );
}
