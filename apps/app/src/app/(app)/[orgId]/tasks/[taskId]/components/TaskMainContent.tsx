'use client';

import { type Task } from '@/lib/db';
import { TaskBody } from './TaskBody';

interface TaskMainContentProps {
  task: Task & { fileUrls?: string[] };
  showComments?: boolean;
}

export function TaskMainContent({ task, showComments = true }: TaskMainContentProps) {
  return <TaskBody taskId={task.id} />;
}
