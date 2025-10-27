'use client';

import { publishAllPoliciesAction } from '@/actions/policies/publish-all';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import { Policy, Task } from '@db';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  ListCheck,
  NotebookText,
  Play,
  Upload,
} from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmActionDialog } from './ConfirmActionDialog';

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
}) {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const memberRoles = currentMember?.role?.split(',').map((r) => r.trim()) ?? [];
  const isOwner = memberRoles.includes('owner') || false;

  const publishPolicies = useAction(publishAllPoliciesAction, {
    onSuccess: () => {
      toast.info('Policies published! Redirecting to policies list...');
    },
    onError: () => {
      toast.error('Failed to publish policies.');
      setIsLoading(false);
    },
  });

  const handlePublishPolicies = async () => {
    setIsLoading(true);
    publishPolicies.execute({
      organizationId,
    });
  };

  const handleConfirmAction = async () => {
    setIsLoading(true);
    try {
      handlePublishPolicies();
    } catch (error) {
      toast.error('Failed to publish policies.');
    } finally {
      setIsLoading(false);
    }
  };

  const width = useMemo(() => {
    return totalPolicies + totalTasks === 0
      ? 0
      : ((totalPolicies + totalTasks - (unpublishedPolicies.length + incompleteTasks.length)) /
          (totalPolicies + totalTasks)) *
          100;
  }, [totalPolicies, totalTasks, unpublishedPolicies.length, incompleteTasks.length]);

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
        <Tabs
          defaultValue={unpublishedPolicies.length === 0 ? 'tasks' : 'policies'}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="policies" className="flex items-center gap-2">
              <FileText className="h-3 w-3" />
              Policies ({remainingPolicies})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <Upload className="h-3 w-3" />
              Tasks ({remainingTasks})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="policies" className="mt-4">
            {isOwner && unpublishedPolicies.length > 0 && (
              <div className="flex w-full mb-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsConfirmDialogOpen(true)}
                  className="flex items-center gap-2 w-full"
                >
                  <Play className="h-3 w-3" />
                  Publish All Policies
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
                            <div
                              className={`flex h-6 w-6 items-center justify-center rounded-full`}
                            >
                              <NotebookText className="h-3 w-3" />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-sm font-medium text-foreground">
                                {policy.name}
                              </span>
                              <span className="text-xs text-muted-foreground capitalize">
                                Status: {formatStatus(policy.status)}
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
                                Status: {formatStatus(task.status)}
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
        </Tabs>
      </CardContent>

      <ConfirmActionDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={handleConfirmAction}
        title="Are you sure you want to publish all policies?"
        description="This will automatically publish all policies that are in draft status. This action cannot be undone."
        confirmText="Publish Policies"
        cancelText="Cancel"
        isLoading={isLoading}
      />
    </Card>
  );
}
