'use client';

import type { Attachment, Member, Task, User } from '@comp/db/types';
import { Card } from '@comp/ui/card';
import { useMemo, useState } from 'react';
import { CommentWithAuthor } from '../../../../../../components/comments/Comments';
import { updateTask } from '../../actions/updateTask';
import { TaskDeleteDialog } from './TaskDeleteDialog';
import { TaskMainContent } from './TaskMainContent';
import { TaskPropertiesSidebar } from './TaskPropertiesSidebar';

interface SingleTaskProps {
  task: Task & { fileUrls?: string[] };
  members?: (Member & { user: User })[];
  comments: CommentWithAuthor[];
  attachments: Attachment[];
}

export function SingleTask({ task, members, comments, attachments }: SingleTaskProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const assignedMember = useMemo(() => {
    if (!task.assigneeId || !members) return null;
    return members.find((m) => m.id === task.assigneeId);
  }, [task.assigneeId, members]);

  const handleUpdateTask = (
    data: Partial<Pick<Task, 'status' | 'assigneeId' | 'frequency' | 'department'>>,
  ) => {
    const updatePayload: Partial<Pick<Task, 'status' | 'assigneeId' | 'frequency' | 'department'>> =
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

    if (Object.keys(updatePayload).length > 0) {
      updateTask({ id: task.id, ...updatePayload });
    }
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden p-4 lg:flex-row lg:gap-16">
      <TaskMainContent task={task} comments={comments} attachments={attachments} />
      <TaskPropertiesSidebar
        task={task}
        members={members}
        assignedMember={assignedMember}
        handleUpdateTask={handleUpdateTask}
        onDeleteClick={() => setDeleteDialogOpen(true)}
      />

      {/* Delete Dialog */}
      <TaskDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        task={task}
      />
    </Card>
  );
}
