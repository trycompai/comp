'use client';

import { regenerateTaskAction } from '@/actions/tasks/regenerate-task-action';
import { Button } from '@comp/ui/button';
import { Card } from '@comp/ui/card';
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
  type Control,
  type Member,
  type Task,
  type User,
} from '@db';
import { RefreshCw, Trash2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useParams } from 'next/navigation';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Comments } from '../../../../../../components/comments/Comments';
import { updateTask } from '../../actions/updateTask';
import { useTaskAutomations } from '../hooks/use-task-automations';
import { TaskAutomations } from './TaskAutomations';
import { TaskDeleteDialog } from './TaskDeleteDialog';
import { TaskMainContent } from './TaskMainContent';
import { TaskPropertiesSidebar } from './TaskPropertiesSidebar';

interface SingleTaskProps {
  task: Task & { fileUrls?: string[]; controls?: Control[] };
  members?: (Member & { user: User })[];
  initialAutomations: EvidenceAutomation[];
}

export function SingleTask({ task, members, initialAutomations }: SingleTaskProps) {
  // Use SWR hook with initial data from server
  const { automations } = useTaskAutomations({
    initialData: initialAutomations,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isRegenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const params = useParams<{ orgId: string }>();
  const orgIdFromParams = params.orgId;
  const isTaskAutomationEnabled = useFeatureFlagEnabled('is-task-automation-enabled');

  const regenerate = useAction(regenerateTaskAction, {
    onSuccess: () => {
      toast.success('Task updated with latest template content.');
    },
    onError: (error) => {
      toast.error(error.error?.serverError || 'Failed to regenerate task');
    },
  });

  const assignedMember = useMemo(() => {
    if (!task.assigneeId || !members) return null;
    return members.find((m) => m.id === task.assigneeId);
  }, [task.assigneeId, members]);

  const handleUpdateTask = (
    data: Partial<Pick<Task, 'status' | 'assigneeId' | 'frequency' | 'department' | 'reviewDate'>>,
  ) => {
    const updatePayload: Partial<
      Pick<Task, 'status' | 'assigneeId' | 'frequency' | 'department' | 'reviewDate'>
    > = {};

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
      updateTask({ id: task.id, ...updatePayload });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 py-8">
      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Title, Description, Content */}
        <div className="lg:col-span-2">
          {/* Header Section */}
          <div className="mb-6">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
              {task.title}
            </h1>
            {task.description && (
              <p className="text-base text-muted-foreground leading-relaxed">{task.description}</p>
            )}
          </div>

          {/* Main Content Area */}
          <div className="space-y-6">
            <TaskMainContent task={task} showComments={false} />

            {/* Comments Section - integrated */}
            <div className="pt-6">
              <Comments
                entityId={task.id}
                entityType={CommentEntityType.task}
                variant="inline"
                title=""
              />
            </div>
          </div>
        </div>

        {/* Right Column - Properties (starts at top) */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-border bg-card shadow-sm sticky top-4 overflow-hidden">
            <div className="relative">
              <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
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
              <div className="p-6">
                <TaskPropertiesSidebar
                  task={task}
                  members={members}
                  assignedMember={assignedMember}
                  handleUpdateTask={handleUpdateTask}
                  orgId={orgIdFromParams}
                />
              </div>
            </div>
          </Card>
          {/* Automations section */}
          {isTaskAutomationEnabled && (
            <Card className="border border-border bg-card shadow-sm sticky top-4 overflow-hidden">
              <TaskAutomations automations={automations || []} />
            </Card>
          )}
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
