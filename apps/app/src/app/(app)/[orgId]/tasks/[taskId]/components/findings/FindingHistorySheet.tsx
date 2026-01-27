'use client';

import { useFindingHistory, type FindingHistoryEntry } from '@/hooks/use-findings-api';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { ScrollArea } from '@comp/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@comp/ui/sheet';
import { formatDistanceToNow } from 'date-fns';
import { History, Loader2 } from 'lucide-react';

interface FindingHistorySheetProps {
  findingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_ICONS: Record<string, string> = {
  created: '➕',
  status_changed: '🔄',
  type_changed: '🏷️',
  content_updated: '✏️',
  deleted: '🗑️',
};

export function FindingHistorySheet({
  findingId,
  open,
  onOpenChange,
}: FindingHistorySheetProps) {
  const { data, isLoading, error } = useFindingHistory(open ? findingId : null);
  const history = data?.data || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Finding History
          </SheetTitle>
          <SheetDescription>
            Activity log for this finding
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load history
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No history available
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4 pr-4">
                {history.map((entry: FindingHistoryEntry, index: number) => (
                  <HistoryEntry 
                    key={entry.id} 
                    entry={entry} 
                    isLast={index === history.length - 1}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function HistoryEntry({ 
  entry, 
  isLast 
}: { 
  entry: FindingHistoryEntry; 
  isLast: boolean;
}) {
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
      {!isLast && (
        <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />
      )}

      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0 ring-2 ring-background">
          <AvatarImage src={entry.user?.image || undefined} alt={entry.user?.name} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{entry.user?.name || 'Unknown'}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
            </span>
          </div>

          <div className="mt-1 flex items-start gap-2">
            <span className="text-sm">{actionIcon}</span>
            <p className="text-sm text-foreground/80">{entry.description}</p>
          </div>

          {/* Show additional details for certain actions */}
          {entry.data.action === 'content_updated' && entry.data.newContent && (
            <div className="mt-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
              <p className="font-medium mb-1">New content:</p>
              <p className="line-clamp-3">{entry.data.newContent}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
