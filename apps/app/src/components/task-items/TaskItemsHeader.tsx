'use client';

import { CardTitle, CardDescription } from '@comp/ui/card';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Loader2, Plus, X } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';

interface TaskItemsHeaderProps {
  title: string;
  description: string;
  statsLoading: boolean;
  stats?: {
    total: number;
    byStatus: {
      todo: number;
      in_progress: number;
      in_review: number;
      done: number;
      canceled: number;
    };
  } | null;
  isCreateOpen: boolean;
  onToggleCreate: () => void;
}

export function TaskItemsHeader({
  title,
  description,
  statsLoading,
  stats,
  isCreateOpen,
  onToggleCreate,
}: TaskItemsHeaderProps) {
  const { hasPermission } = usePermissions();
  const canCreateTask = hasPermission('task', 'create');

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <CardTitle>{title}</CardTitle>
          {statsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            stats && stats.total > 0 && (
              <Badge variant="secondary" className="tabular-nums">
                {stats.total}
              </Badge>
            )
          )}
        </div>
        <CardDescription className="mt-1">{description}</CardDescription>
        {!statsLoading && stats && stats.total > 0 && (
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {stats.byStatus.todo > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {stats.byStatus.todo} Todo
                </span>
              </div>
            )}
            {stats.byStatus.in_progress > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                <span className="text-xs text-muted-foreground">
                  {stats.byStatus.in_progress} In Progress
                </span>
              </div>
            )}
            {stats.byStatus.in_review > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400" />
                <span className="text-xs text-muted-foreground">
                  {stats.byStatus.in_review} In Review
                </span>
              </div>
            )}
            {stats.byStatus.done > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">
                  {stats.byStatus.done} Done
                </span>
              </div>
            )}
            {stats.byStatus.canceled > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {stats.byStatus.canceled} Canceled
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      {canCreateTask && (
        <Button
          size="icon"
          onClick={onToggleCreate}
          variant={isCreateOpen ? 'outline' : 'default'}
          aria-label={isCreateOpen ? 'Close create task' : 'Create task'}
          className="transition-all duration-200 flex-shrink-0"
        >
          <span className="relative inline-flex items-center justify-center">
            <Plus
              className={`h-4 w-4 absolute transition-all duration-200 ${
                isCreateOpen ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
              }`}
            />
            <X
              className={`h-4 w-4 absolute transition-all duration-200 ${
                isCreateOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
              }`}
            />
          </span>
        </Button>
      )}
    </div>
  );
}

