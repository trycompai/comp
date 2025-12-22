'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Circle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { TaskItem } from '@/hooks/use-task-items';
import { useTaskItemActivity } from './hooks/use-task-item-activity';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@comp/ui/button';

interface TaskItemActivityTimelineProps {
  taskItem: TaskItem;
  onActivityLoaded?: (mutate: () => void) => void;
}

export function TaskItemActivityTimeline({ taskItem, onActivityLoaded }: TaskItemActivityTimelineProps) {
  const { activity, isLoading, mutate } = useTaskItemActivity(taskItem.id);
  const [showAll, setShowAll] = useState(false);

  // Expose mutate function to parent
  useEffect(() => {
    if (onActivityLoaded) {
      onActivityLoaded(mutate);
    }
  }, [onActivityLoaded, mutate]);

  // Show first 3 and last 5 items if more than 10
  const displayedActivity = useMemo(() => {
    if (showAll || activity.length <= 10) {
      return activity;
    }

    const firstItems = activity.slice(0, 3);
    const lastItems = activity.slice(-5);
    const hiddenCount = activity.length - 8;

    return { firstItems, lastItems, hiddenCount };
  }, [activity, showAll]);
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Activity</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const renderActivityItem = (log: any) => (
    <div key={log.id} className="flex items-start gap-3 relative">
      <Avatar className="h-6 w-6 border border-border relative z-10 bg-background">
        <AvatarImage
          src={log.user.image || undefined}
          alt={log.user.name || log.user.email}
        />
        <AvatarFallback className="text-[10px] bg-muted">
          {(log.user.name || log.user.email)?.charAt(0).toUpperCase() ?? '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{log.user.name || log.user.email}</span>{' '}
          {log.description}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Activity</h3>
      </div>
      <div className="relative">
        {/* Timeline line */}
        {activity.length > 0 && (
          <div className="absolute left-3 top-6 bottom-0 w-px bg-border" />
        )}
        
        <div className="space-y-4">
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          ) : Array.isArray(displayedActivity) ? (
            // Show all items
            displayedActivity.map(renderActivityItem)
          ) : (
            // Show collapsed view
            <>
              {displayedActivity.firstItems.map(renderActivityItem)}
              
              <div className="flex items-center gap-3 relative">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center relative z-10">
                  <Circle className="h-2 w-2 text-muted-foreground fill-current" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(true)}
                  className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Show {displayedActivity.hiddenCount} more {displayedActivity.hiddenCount === 1 ? 'activity' : 'activities'}
                </Button>
              </div>

              {displayedActivity.lastItems.map(renderActivityItem)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

