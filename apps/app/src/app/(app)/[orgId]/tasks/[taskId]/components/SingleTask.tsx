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
import type { Control, Member, Task, User } from '@db';
import { useAction } from 'next-safe-action/hooks';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { updateTask } from '../../actions/updateTask';
import { TaskDeleteDialog } from './TaskDeleteDialog';
import { TaskMainContent } from './TaskMainContent';
import { TaskPropertiesSidebar } from './TaskPropertiesSidebar';

interface SingleTaskProps {
  task: Task & { fileUrls?: string[]; controls?: Control[] };
  members?: (Member & { user: User })[];
}

export function SingleTask({ task, members }: SingleTaskProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isRegenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const params = useParams<{ orgId: string }>();
  const orgIdFromParams = params.orgId;

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
    const updatePayload: Partial<Pick<Task, 'status' | 'assigneeId' | 'frequency' | 'department' | 'reviewDate'>> =
      {};

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
    <Card className="flex h-full flex-col overflow-hidden p-4 lg:flex-row lg:gap-16">
      <TaskMainContent task={task} />
      <TaskPropertiesSidebar
        task={task}
        members={members}
        assignedMember={assignedMember}
        handleUpdateTask={handleUpdateTask}
        onDeleteClick={() => setDeleteDialogOpen(true)}
        onRegenerateClick={() => setRegenerateConfirmOpen(true)}
        orgId={orgIdFromParams}
      />

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
    </Card>
  );
}
