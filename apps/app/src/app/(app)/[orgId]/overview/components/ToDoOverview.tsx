'use client';

import { useApiSWR } from '@/hooks/use-api-swr';
import { usePermissions } from '@/hooks/use-permissions';
import { Policy, Task } from '@db';
import { Button } from '@trycompai/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@trycompai/ui/card';
import { ScrollArea } from '@trycompai/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@trycompai/ui/tabs';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  ListCheck,
  NotebookText,
  Play,
  Upload,
  UserMinus,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  formatQuickActionStatus,
  getQuickActionProgressWidth,
  type PendingOffboardingResponse,
  usePublishAllPoliciesAction,
} from './overview-quick-actions';

export function ToDoOverview({
  totalPolicies,
  totalTasks,
  remainingPolicies,
  remainingTasks,
  unpublishedPolicies,
  incompleteTasks,
  policiesInReview,
  organizationId,
  currentMember,
  onboardingTriggerJobId,
}: {
  totalPolicies: number;
  totalTasks: number;
  remainingPolicies: number;
  remainingTasks: number;
  unpublishedPolicies: Policy[];
  incompleteTasks: Task[];
  policiesInReview: Policy[];
  organizationId: string;
  currentMember: { id: string; role: string } | null;
  onboardingTriggerJobId: string | null;
}) {
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState(
    unpublishedPolicies.length === 0 ? 'tasks' : 'policies',
  );

  const {
    data: pendingData,
    isLoading: isPendingLoading,
    error: pendingError,
  } = useApiSWR<PendingOffboardingResponse>('/v1/offboarding-checklist/pending');
  const pendingOffboardings = pendingData?.data?.members ?? [];

  useEffect(() => {
    if (!isPendingLoading && pendingOffboardings.length > 0) {
      setActiveTab('offboarding');
    }
  }, [isPendingLoading, pendingOffboardings.length]);

  const isOnboardingInProgress = !!onboardingTriggerJobId;

  const canPublishPolicies = hasPermission('policy', 'update');
  const { handlePublishAllClick, publishAllPoliciesDialog } = usePublishAllPoliciesAction({
    unpublishedPolicies,
  });
  const width = getQuickActionProgressWidth({
    totalPolicies,
    totalTasks,
    unpublishedPolicies: unpublishedPolicies.length,
    incompleteTasks: incompleteTasks.length,
  });

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">{'Quick Actions'}</CardTitle>
        </div>

        <div className="bg-secondary/50 relative mt-2 h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all"
            style={{
              width: `${width}%`,
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="policies" className="flex items-center gap-2">
              <FileText className="h-3 w-3" />
              Policies ({remainingPolicies})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <Upload className="h-3 w-3" />
              Tasks ({remainingTasks})
            </TabsTrigger>
            <TabsTrigger value="offboarding" className="flex items-center gap-2">
              <UserMinus className="h-3 w-3" />
              Offboarding ({pendingOffboardings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="policies" className="mt-4">
            {canPublishPolicies && unpublishedPolicies.length > 0 && (
              <div className="flex w-full mb-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePublishAllClick}
                  className="flex items-center gap-2 w-full"
                  disabled={isOnboardingInProgress}
                  title={
                    isOnboardingInProgress ? 'Please wait for onboarding to complete' : undefined
                  }
                >
                  <Play className="h-3 w-3" />
                  {isOnboardingInProgress ? 'Onboarding in progress...' : 'Publish All Policies'}
                </Button>
              </div>
            )}

            {unpublishedPolicies.length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-accent p-3">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">All policies are published!</span>
              </div>
            ) : (
              <div className="h-[300px]">
                <ScrollArea className="h-full">
                  <div className="space-y-0 pr-4">
                    {unpublishedPolicies.map((policy, index) => (
                      <div key={policy.id}>
                        <div className="flex items-start justify-between py-3 px-1">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full">
                              <NotebookText className="h-3 w-3" />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-sm font-medium text-foreground">
                                {policy.name}
                              </span>
                              <span className="text-xs text-muted-foreground capitalize">
                                Status: {formatQuickActionStatus(policy.status)}
                              </span>
                            </div>
                          </div>
                          <Button asChild size="icon" variant="outline">
                            <Link href={`/${organizationId}/policies/${policy.id}`}>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                        {index < unpublishedPolicies.length - 1 && (
                          <div className="border-t border-muted/30" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            {incompleteTasks.length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-accent p-3">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary">All tasks are completed!</span>
              </div>
            ) : (
              <div className="h-[300px]">
                <ScrollArea className="h-full">
                  <div className="space-y-0 pr-4">
                    {incompleteTasks.map((task, index) => (
                      <div key={task.id}>
                        <div className="flex items-start justify-between py-3 px-1">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full">
                              <ListCheck className="h-3 w-3" />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-sm font-medium text-foreground">
                                {task.title}
                              </span>
                              <span className="text-xs text-muted-foreground capitalize">
                                Status: {formatQuickActionStatus(task.status)}
                              </span>
                            </div>
                          </div>
                          <Button asChild size="icon" variant="outline">
                            <Link href={`/${organizationId}/tasks/${task.id}`}>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                        {index < incompleteTasks.length - 1 && (
                          <div className="border-t border-muted/30" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="offboarding" className="mt-4">
            {isPendingLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-accent p-3">
                <span className="text-sm text-muted-foreground">Loading offboardings...</span>
              </div>
            ) : pendingError ? (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-accent p-3">
                <span className="text-sm text-destructive">Failed to load offboardings</span>
              </div>
            ) : pendingOffboardings.length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-accent p-3">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary">No pending offboardings</span>
              </div>
            ) : (
              <div className="h-[300px]">
                <ScrollArea className="h-full">
                  <div className="space-y-0 pr-4">
                    {pendingOffboardings.map((member, index) => (
                      <div key={member.memberId}>
                        <div className="flex items-start justify-between px-1 py-3">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full">
                              <UserMinus className="h-3 w-3" />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="text-sm font-medium text-foreground">
                                Complete offboarding for {member.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {member.completedItems}/{member.totalItems} tasks done
                              </span>
                            </div>
                          </div>
                          <Button asChild size="icon" variant="outline">
                            <Link
                              href={`/${organizationId}/people/${member.memberId}?tab=offboarding`}
                            >
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                        {index < pendingOffboardings.length - 1 && (
                          <div className="border-t border-muted/30" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {publishAllPoliciesDialog}
    </Card>
  );
}
