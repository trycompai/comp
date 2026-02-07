'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import type { AuditLog } from '@db';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { type ActivityLog, useTaskActivity } from '../hooks/use-task-activity';

type ActionType = 'review' | 'approve' | 'reject' | 'create' | 'update' | 'delete';

const actionColors: Record<string, string> = {
  approve: 'bg-primary/15 text-primary border-transparent dark:bg-primary/25 dark:brightness-150',
  reject: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  review: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

function getAction(log: AuditLog): ActionType {
  const data = log.data as Record<string, unknown> | null;
  return (data?.action as ActionType) || 'update';
}

function LogEntry({ log, isLast = false }: { log: ActivityLog; isLast?: boolean }) {
  const action = getAction(log);
  const user = log.user;
  const userName = user?.name || user?.email || 'Unknown';

  return (
    <div className="relative flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <Avatar className="h-8 w-8 shrink-0 relative z-10">
          {user?.image && <AvatarImage src={user.image} alt={userName} />}
          <AvatarFallback className="text-xs">
            {userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {!isLast && (
          <div className="w-px flex-1 bg-border mt-1" />
        )}
      </div>
      <div className="flex-1 min-w-0 pb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{userName}</span>
          <Badge
            variant="outline"
            className={cn('text-xs px-2 py-0.5 font-medium', actionColors[action])}
          >
            {action.charAt(0).toUpperCase() + action.slice(1)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{log.description}</p>
        <span className="text-xs text-muted-foreground/60 mt-0.5">
          {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
        </span>
      </div>
    </div>
  );
}

function LogEntryCompact({ log }: { log: ActivityLog }) {
  const action = getAction(log);
  const user = log.user;
  const userName = user?.name || user?.email || 'Unknown';

  return (
    <div className="flex items-start gap-2.5">
      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
        {user?.image && <AvatarImage src={user.image} alt={userName} />}
        <AvatarFallback className="text-[10px]">
          {userName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium truncate">{userName}</span>
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0 font-medium', actionColors[action])}
          >
            {action.charAt(0).toUpperCase() + action.slice(1)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{log.description}</p>
        <span className="text-[10px] text-muted-foreground/60">
          {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
        </span>
      </div>
    </div>
  );
}

const COLLAPSED_COUNT = 3;
const PAGE_SIZE = 10;

export function TaskActivity() {
  const [expanded, setExpanded] = useState(false);
  const [take, setTake] = useState(COLLAPSED_COUNT);
  const { logs, total } = useTaskActivity({ take });

  if (logs.length === 0) return null;

  const hasMore = total > COLLAPSED_COUNT;
  const hasNextPage = expanded && logs.length < total;

  const handleExpand = () => {
    setExpanded(true);
    setTake(PAGE_SIZE);
  };

  const handleCollapse = () => {
    setExpanded(false);
    setTake(COLLAPSED_COUNT);
  };

  const handleLoadMore = () => {
    setTake((prev) => prev + PAGE_SIZE);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Activity</h3>
      <div className="space-y-3">
        {logs.map((log) => (
          <LogEntryCompact key={log.id} log={log} />
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {hasNextPage && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-auto py-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleLoadMore}
          >
            <ChevronDown className="h-3 w-3 mr-1" />
            Load more
          </Button>
        )}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-auto py-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={expanded ? handleCollapse : handleExpand}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                View all
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export function TaskActivityFull() {
  const [page, setPage] = useState(1);
  const skip = (page - 1) * PAGE_SIZE;
  const { logs, total, isLoading } = useTaskActivity({ take: PAGE_SIZE, skip });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Loading activity...</p>
      </div>
    );
  }

  if (logs.length === 0 && page === 1) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="min-h-[540px]">
        {logs.map((log, index) => (
          <LogEntry
            key={log.id}
            log={log}
            isLast={index === logs.length - 1}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs cursor-pointer"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) {
                  acc.push('ellipsis');
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item, i) =>
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">...</span>
                ) : (
                  <Button
                    key={item}
                    variant={page === item ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 w-7 p-0 text-xs cursor-pointer"
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </Button>
                ),
              )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs cursor-pointer"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
