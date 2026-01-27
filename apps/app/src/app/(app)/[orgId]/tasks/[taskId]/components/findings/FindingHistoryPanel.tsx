'use client';

import { useFindingHistory, type FindingHistoryEntry } from '@/hooks/use-findings-api';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Button } from '@comp/ui/button';
import { ScrollArea } from '@comp/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { History, Loader2, X } from 'lucide-react';

interface FindingHistoryPanelProps {
  findingId: string;
  onClose: () => void;
}

const ACTION_ICONS: Record<string, string> = {
  created: '➕',
  status_changed: '🔄',
  type_changed: '🏷️',
  content_updated: '✏️',
  deleted: '🗑️',
};

export function FindingHistoryPanel({ findingId, onClose }: FindingHistoryPanelProps) {
  const { data, isLoading, error } = useFindingHistory(findingId);
  const history = data?.data || [];

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Finding History</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-6 text-sm text-destructive">Failed to load history</div>
        ) : history.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">No history available</div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3 pr-2">
              {history.map((entry: FindingHistoryEntry, index: number) => (
                <HistoryEntry key={entry.id} entry={entry} isLast={index === history.length - 1} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function HistoryEntry({ entry, isLast }: { entry: FindingHistoryEntry; isLast: boolean }) {
  const initials =
    entry.user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';

  const actionIcon = ACTION_ICONS[entry.data.action] || '📝';

  return (
    <div className="relative">
      {/* Timeline connector */}
      {!isLast && <div className="absolute left-3 top-8 bottom-0 w-px bg-border" />}

      <div className="flex gap-2.5">
        <Avatar className="h-6 w-6 shrink-0 ring-2 ring-background">
          <AvatarImage src={entry.user?.image || undefined} alt={entry.user?.name} />
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 pb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-xs">{entry.user?.name || 'Unknown'}</span>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
            </span>
          </div>

          <div className="mt-0.5 flex items-start gap-1.5">
            <span className="text-xs">{actionIcon}</span>
            <p className="text-xs text-foreground/80">{entry.description}</p>
          </div>

          {/* Show additional details for content updates */}
          {entry.data.action === 'content_updated' && entry.data.newContent && (
            <div className="mt-1.5 p-1.5 rounded bg-muted/50 text-[10px] text-muted-foreground">
              <p className="font-medium mb-0.5">New content:</p>
              <p className="line-clamp-2">{entry.data.newContent}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
