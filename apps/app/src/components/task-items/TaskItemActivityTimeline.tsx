'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { TaskItem } from '@/hooks/use-task-items';

interface TaskItemActivityTimelineProps {
  taskItem: TaskItem;
}

export function TaskItemActivityTimeline({ taskItem }: TaskItemActivityTimelineProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Activity</h3>
      </div>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-6 bottom-0 w-px bg-border" />
        
        <div className="space-y-4">
          {/* Created activity */}
          <div className="flex items-start gap-3 relative">
            <Avatar className="h-6 w-6 border border-border relative z-10 bg-background">
              <AvatarImage
                src={taskItem.createdBy.user.image || undefined}
                alt={taskItem.createdBy.user.name}
              />
              <AvatarFallback className="text-[10px] bg-muted">
                {taskItem.createdBy.user.name?.charAt(0).toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{taskItem.createdBy.user.name}</span> created the
                task
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(taskItem.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Status change activity (if updated) */}
          {taskItem.updatedBy && taskItem.updatedBy.id !== taskItem.createdBy.id && (
            <div className="flex items-start gap-3 relative">
              <div className="h-6 w-6 rounded-full bg-yellow-500/20 flex items-center justify-center relative z-10 border-2 border-background">
                <Circle className="h-3 w-3 text-yellow-500 fill-current" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{taskItem.updatedBy.user.name}</span> updated the
                  task
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(taskItem.updatedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          )}

          {/* Assignment activity (if assigned) */}
          {taskItem.assignee && (
            <div className="flex items-start gap-3 relative">
              <Avatar className="h-6 w-6 border border-border relative z-10 bg-background">
                <AvatarImage
                  src={taskItem.assignee.user.image || undefined}
                  alt={taskItem.assignee.user.name}
                />
                <AvatarFallback className="text-[10px] bg-muted">
                  {taskItem.assignee.user.name?.charAt(0).toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  Assigned to <span className="font-medium">{taskItem.assignee.user.name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {taskItem.updatedBy && taskItem.updatedBy.id !== taskItem.createdBy.id
                    ? `by ${taskItem.updatedBy.user.name}`
                    : `by ${taskItem.createdBy.user.name}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

