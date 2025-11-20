"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { publishAllPoliciesAction } from "@/actions/policies/publish-all";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  ListCheck,
  NotebookText,
  Play,
  Upload,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { Policy, Task } from "@trycompai/db";
import { Button } from "@trycompai/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@trycompai/ui/card";
import { ScrollArea } from "@trycompai/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@trycompai/ui/tabs";

import { ConfirmActionDialog } from "./ConfirmActionDialog";

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
    return status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const memberRoles =
    currentMember?.role?.split(",").map((r) => r.trim()) ?? [];
  const isOwner = memberRoles.includes("owner") || false;

  const publishPolicies = useAction(publishAllPoliciesAction, {
    onSuccess: () => {
      toast.info("Policies published! Redirecting to policies list...");
    },
    onError: () => {
      toast.error("Failed to publish policies.");
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
      toast.error("Failed to publish policies.");
    } finally {
      setIsLoading(false);
    }
  };

  const width = useMemo(() => {
    return totalPolicies + totalTasks === 0
      ? 0
      : ((totalPolicies +
          totalTasks -
          (unpublishedPolicies.length + incompleteTasks.length)) /
          (totalPolicies + totalTasks)) *
          100;
  }, [
    totalPolicies,
    totalTasks,
    unpublishedPolicies.length,
    incompleteTasks.length,
  ]);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {"Quick Actions"}
          </CardTitle>
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
          defaultValue={unpublishedPolicies.length === 0 ? "tasks" : "policies"}
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
              <div className="mb-3 flex w-full">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsConfirmDialogOpen(true)}
                  className="flex w-full items-center gap-2"
                >
                  <Play className="h-3 w-3" />
                  Publish All Policies
                </Button>
              </div>
            )}

            {unpublishedPolicies.length === 0 ? (
              <div className="bg-accent flex items-center justify-center gap-2 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">All policies are published!</span>
              </div>
            ) : (
              <div className="h-[300px]">
                <ScrollArea className="h-full">
                  <div className="space-y-0 pr-4">
                    {unpublishedPolicies.map((policy, index) => (
                      <div key={policy.id}>
                        <div className="flex items-start justify-between px-1 py-3">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div
                              className={`flex h-6 w-6 items-center justify-center rounded-full`}
                            >
                              <NotebookText className="h-3 w-3" />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="text-foreground text-sm font-medium">
                                {policy.name}
                              </span>
                              <span className="text-muted-foreground text-xs capitalize">
                                Status: {formatStatus(policy.status)}
                              </span>
                            </div>
                          </div>
                          <Button asChild size="icon" variant="outline">
                            <Link
                              href={`/${organizationId}/policies/${policy.id}`}
                            >
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                        {index < unpublishedPolicies.length - 1 && (
                          <div className="border-muted/30 border-t" />
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
              <div className="bg-accent flex items-center justify-center gap-2 rounded-lg p-3">
                <CheckCircle2 className="text-primary h-4 w-4" />
                <span className="text-primary text-sm">
                  All tasks are completed!
                </span>
              </div>
            ) : (
              <div className="h-[300px]">
                <ScrollArea className="h-full">
                  <div className="space-y-0 pr-4">
                    {incompleteTasks.map((task, index) => (
                      <div key={task.id}>
                        <div className="flex items-start justify-between px-1 py-3">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full">
                              <ListCheck className="h-3 w-3" />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="text-foreground text-sm font-medium">
                                {task.title}
                              </span>
                              <span className="text-muted-foreground text-xs capitalize">
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
                          <div className="border-muted/30 border-t" />
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
