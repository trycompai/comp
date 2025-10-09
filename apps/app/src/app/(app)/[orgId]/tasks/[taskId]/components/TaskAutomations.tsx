'use client';

import { cn } from '@/lib/utils';
import { Button } from '@comp/ui/button';
import { CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { EvidenceAutomation, EvidenceAutomationRun } from '@db';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Code, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTaskAutomations } from '../hooks/use-task-automations';

type AutomationWithLatestRun = EvidenceAutomation & {
  runs: EvidenceAutomationRun[];
};

export const TaskAutomations = ({ automations }: { automations: AutomationWithLatestRun[] }) => {
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
    <>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          Automated Evidence
        </CardTitle>
      </CardHeader>

      <CardContent>
        {automations.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Code className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">No automations yet</h4>
              <p className="text-sm text-muted-foreground">
                Create an AI automation to collect evidence for this task
              </p>
            </div>
            <Button onClick={handleCreateAutomation} disabled={isCreating} className="w-full">
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {isCreating ? 'Creating...' : 'Create Automation'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {automations.map((automation) => {
              const latestRun = automation.runs[0];
              const runStatus = latestRun?.status;
              const lastRan = latestRun?.createdAt
                ? formatDistanceToNow(new Date(latestRun.createdAt), { addSuffix: true })
                : null;

              return (
                <Link
                  href={`/${orgId}/tasks/${taskId}/automations/${automation.id}/overview`}
                  key={automation.id}
                  className={cn(
                    'flex flex-row items-center justify-between p-3 rounded-lg border border-border',
                    'hover:scale-102 transition-all duration-300',
                    'cursor-pointer',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full flex-shrink-0 ${
                          !latestRun
                            ? 'bg-muted-foreground/30'
                            : runStatus === 'completed'
                              ? 'bg-chart-positive'
                              : runStatus === 'failed'
                                ? 'bg-chart-destructive'
                                : runStatus === 'running'
                                  ? 'bg-chart-other animate-pulse'
                                  : 'bg-chart-neutral'
                        }`}
                      />
                      <p className="font-medium text-foreground text-xs">{automation.name}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 ml-4">
                      {lastRan ? `Last ran ${lastRan}` : 'No runs yet'}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 flex-shrink-0" />
                </Link>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleCreateAutomation}
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {isCreating ? 'Creating...' : 'Create Another'}
            </Button>
          </div>
        )}
      </CardContent>
    </>
  );
};
