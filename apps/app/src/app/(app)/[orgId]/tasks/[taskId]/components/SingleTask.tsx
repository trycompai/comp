'use client';

import { regenerateTaskAction } from '@/actions/tasks/regenerate-task-action';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@comp/ui/breadcrumb';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import {
  CommentEntityType,
  EvidenceAutomation,
  EvidenceAutomationRun,
  type Control,
  type Member,
  type Task,
  type User,
} from '@db';
import { ChevronRight, RefreshCw, Trash2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Comments } from '../../../../../../components/comments/Comments';
import { updateTask } from '../../actions/updateTask';
import { useTask } from '../hooks/use-task';
import { useTaskAutomations } from '../hooks/use-task-automations';
import { useTaskIntegrationChecks } from '../hooks/use-task-integration-checks';
import { BrowserAutomations } from './BrowserAutomations';
import { TaskAutomations } from './TaskAutomations';
import { TaskDeleteDialog } from './TaskDeleteDialog';
import { TaskIntegrationChecks } from './TaskIntegrationChecks';
import { TaskMainContent } from './TaskMainContent';
import { TaskPropertiesSidebar } from './TaskPropertiesSidebar';

type AutomationWithRuns = EvidenceAutomation & {
  runs: EvidenceAutomationRun[];
};

interface SingleTaskProps {
  initialTask: Task & { fileUrls?: string[]; controls?: Control[] };
  initialMembers?: (Member & { user: User })[];
  initialAutomations: AutomationWithRuns[];
  isWebAutomationsEnabled: boolean;
}

export function SingleTask({
  initialTask,
  initialAutomations,
  isWebAutomationsEnabled,
}: SingleTaskProps) {
  const params = useParams();
  const orgId = params.orgId as string;

  // Use SWR hooks with initial data from server
  const {
    task,
    isLoading,
    mutate: mutateTask,
  } = useTask({
    initialData: initialTask,
  });
  const { automations } = useTaskAutomations({
    initialData: initialAutomations,
  });
  const { hasMappedChecks } = useTaskIntegrationChecks();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isRegenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);

  const regenerate = useAction(regenerateTaskAction, {
    onSuccess: () => {
      toast.success('Task updated with latest template content.');
    },
    onError: (error) => {
      toast.error(error.error?.serverError || 'Failed to regenerate task');
    },
  });

  const handleUpdateTask = async (
    data: Partial<Pick<Task, 'status' | 'assigneeId' | 'frequency' | 'department' | 'reviewDate'>>,
  ) => {
    const updatePayload: Partial<
      Pick<Task, 'status' | 'assigneeId' | 'frequency' | 'department' | 'reviewDate'>
    > = {};

    if (!task) return;

    if (data.status !== undefined) {
      updatePayload.status = data.status;
    }
    if (data.department !== undefined) {
      updatePayload.department = data.department;
    }
    if (data.assigneeId !== undefined) {
      updatePayload.assigneeId = data.assigneeId;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'frequency')) {
      updatePayload.frequency = data.frequency;
    }
    if (data.reviewDate !== undefined) {
      updatePayload.reviewDate = data.reviewDate;
    }
    if (Object.keys(updatePayload).length > 0) {
      const result = await updateTask({ id: task.id, ...updatePayload });
      if (result.success) {
        // Refresh the task data from the server
        await mutateTask();
      }
    }
  };

  // Early return if task doesn't exist
  if (!task || isLoading) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 animate-in fade-in slide-in-from-bottom-4 duration-500 py-6">
      {/* Breadcrumb */}
      <div className="mb-5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href={`/${orgId}/tasks`}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  Tasks
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <span className="text-foreground font-medium text-sm">{task.title}</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Title, Description, Automations (Front & Center) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Section */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
                  {task.title}
                </h1>
                {task.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {task.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRegenerateConfirmOpen(true)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Regenerate task"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  title="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-3">
            <TaskMainContent task={task} showComments={false} />
          </div>

          {/* Integration Checks Section */}
          <TaskIntegrationChecks taskId={task.id} onTaskUpdated={() => mutateTask()} />

          {/* Browser Automations Section */}
          {isWebAutomationsEnabled && <BrowserAutomations taskId={task.id} />}

          {/* Custom Automations Section - always show if automations exist, or show empty state if no integration checks */}
          {((automations && automations.length > 0) || !hasMappedChecks) && (
            <TaskAutomations automations={automations || []} />
          )}

          {/* Comments Section */}
          <div>
            <Comments
              entityId={task.id}
              entityType={CommentEntityType.task}
              variant="inline"
              title=""
            />
          </div>
        </div>

        {/* Right Column - Properties */}
        <div className="lg:col-span-1">
          <div className="pl-6 border-l border-border">
            <TaskPropertiesSidebar handleUpdateTask={handleUpdateTask} />
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <TaskDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        task={task}
      />

      {/* Regenerate Confirmation Dialog */}
      <Dialog open={isRegenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Task</DialogTitle>
            <DialogDescription>
              This will update the task title and description with the latest content from the
              framework template. The current content will be replaced. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                regenerate.execute({ taskId: task.id });
                setRegenerateConfirmOpen(false);
              }}
              disabled={regenerate.status === 'executing'}
            >
              {regenerate.status === 'executing' ? 'Working…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
