'use client';

import { cn } from '@/lib/utils';
import { EvidenceAutomation, EvidenceAutomationRun } from '@db';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Brain, CheckCircle2, Loader2, Plus, TrendingUp, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTaskAutomations } from '../hooks/use-task-automations';

type AutomationWithLatestRun = EvidenceAutomation & {
  runs: EvidenceAutomationRun[];
};

interface TaskAutomationsProps {
  automations: AutomationWithLatestRun[];
}

export const TaskAutomations = ({ automations }: TaskAutomationsProps) => {
  const { orgId, taskId } = useParams<{ orgId: string; taskId: string }>();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const { mutate: mutateAutomations } = useTaskAutomations();

  const handleCreateAutomation = async () => {
    // Redirect to automation builder with ephemeral mode
    // The automation will only be created once the user sends their first message
    router.push(`/${orgId}/tasks/${taskId}/automation/new`);
  };

  // If there are no automations, show a prominent empty state card
  if (automations.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-muted">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Custom Automations</h3>
              <p className="text-xs text-muted-foreground">Build AI-powered automations for this task</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <button
            onClick={handleCreateAutomation}
            className="w-full flex items-center gap-4 p-4 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                Create Custom Automation
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use AI to build automated evidence collection tailored to your needs
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </button>
        </div>
      </div>
    );
  }

  // Calculate next scheduled run (daily at 9 AM UTC)
  const getNextScheduledRun = () => {
    const now = new Date();
    let nextRun = new Date();
    nextRun.setUTCHours(9, 0, 0, 0); // 9:00 AM UTC

    // If we're past 9 AM UTC today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
  };

  const enabledAutomations = automations.filter((a) => a.isEnabled);
  const nextRun = enabledAutomations.length > 0 ? getNextScheduledRun() : null;

  // If there are automations, show the full card
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Card Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-muted">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Custom Automations</h3>
              <p className="text-xs text-muted-foreground">Created with the help of an AI agent</p>
            </div>
          </div>
          {nextRun && (
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Next run
              </div>
              <div className="text-sm font-medium text-foreground">
                {formatDistanceToNow(nextRun, { addSuffix: true })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5">
        <div className="space-y-4">
          {/* Automation Metrics Summary */}
          {(() => {
            const allRuns = automations.flatMap((a) => a.runs.filter((r) => r.version !== null));

            const totalRuns = allRuns.length;
            const successfulRuns = allRuns.filter(
              (r) => r.status === 'completed' && r.success && r.evaluationStatus !== 'fail',
            ).length;
            const failedRuns = allRuns.filter(
              (r) => r.status === 'failed' || r.evaluationStatus === 'fail',
            ).length;

            const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;

            if (totalRuns === 0) return null;

            return (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Total Runs */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground uppercase tracking-[0.1em] font-medium">
                      Total Runs
                    </span>
                  </div>
                  <div className="text-xl font-semibold text-foreground tabular-nums">
                    {totalRuns}
                  </div>
                </div>

                {/* Success Rate */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[9px] text-muted-foreground uppercase tracking-[0.1em] font-medium">
                      Success Rate
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-xl font-semibold text-foreground tabular-nums">
                      {successRate}%
                    </div>
                    <div className="flex-1 max-w-[60px] bg-muted/50 h-1 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-500"
                        style={{ width: `${successRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {failedRuns > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-[9px] text-muted-foreground uppercase tracking-[0.1em] font-medium">
                        Issues
                      </span>
                    </div>
                    <div className="text-xl font-semibold text-destructive tabular-nums">
                      {failedRuns}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="space-y-2">
            {automations.map((automation) => {
              // Show only the latest version run (ignore draft runs)
              const latestVersionRun = automation.runs.find((run) => run.version !== null);

              const runStatus = latestVersionRun?.status;
              const lastRan = latestVersionRun?.createdAt
                ? formatDistanceToNow(new Date(latestVersionRun.createdAt), { addSuffix: true })
                : null;
              const runVersion = latestVersionRun?.version;

              // Determine dot color and glow
              const hasFailed =
                latestVersionRun &&
                (runStatus === 'failed' || latestVersionRun.evaluationStatus === 'fail');
              const dotColor = hasFailed
                ? 'bg-destructive shadow-[0_0_8px_rgba(255,0,0,0.3)]'
                : automation.isEnabled
                  ? 'bg-primary shadow-[0_0_8px_rgba(0,77,64,0.4)]'
                  : 'bg-muted-foreground';

              return (
                <Link
                  key={automation.id}
                  href={`/${orgId}/tasks/${taskId}/automations/${automation.id}/overview`}
                  className={cn(
                    'block rounded-lg border transition-all duration-300',
                    'border-border/50 hover:border-border hover:shadow-sm',
                    'group',
                  )}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', dotColor)} />

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm tracking-tight">
                        {automation.name}
                      </p>
                      {latestVersionRun && lastRan ? (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Last ran {lastRan}
                          <span className="ml-2">• v{runVersion}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          No published runs yet
                        </p>
                      )}
                    </div>

                    <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>

          <button
            onClick={handleCreateAutomation}
            disabled={isCreating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border/60 hover:border-border hover:bg-muted/30 transition-all text-xs text-muted-foreground hover:text-foreground"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Create Another
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
