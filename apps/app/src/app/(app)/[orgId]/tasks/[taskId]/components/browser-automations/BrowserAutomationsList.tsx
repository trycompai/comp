'use client';

import { Badge } from '@comp/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Globe, Plus } from 'lucide-react';
import { useState } from 'react';
import type { BrowserAutomation } from '../../hooks/types';
import { AutomationItem } from './AutomationItem';

// Calculate next scheduled run (daily at 5:00 AM UTC)
const getNextScheduledRun = (): Date => {
  const now = new Date();

  // Create a Date representing 5:00 AM UTC today (not local time).
  const nextRunUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0, 0),
  );

  // If we're past 5:00 AM UTC today, schedule for tomorrow at 5:00 AM UTC.
  if (nextRunUtc.getTime() <= now.getTime()) {
    return new Date(nextRunUtc.getTime() + 24 * 60 * 60 * 1000);
  }

  return nextRunUtc;
};

interface BrowserAutomationsListProps {
  automations: BrowserAutomation[];
  hasContext: boolean;
  runningAutomationId: string | null;
  onRun: (automationId: string) => void;
  onCreateClick: () => void;
  onEditClick: (automation: BrowserAutomation) => void;
}

export function BrowserAutomationsList({
  automations,
  hasContext,
  runningAutomationId,
  onRun,
  onCreateClick,
  onEditClick,
}: BrowserAutomationsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const nextRun = automations.length > 0 ? getNextScheduledRun() : null;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-muted">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Browser Automations</h3>
              <p className="text-xs text-muted-foreground">
                Capture screenshots from authenticated web pages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {nextRun && (
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Next run
                </div>
                <div className="text-sm font-medium text-foreground">
                  {formatDistanceToNow(nextRun, { addSuffix: true })}
                </div>
              </div>
            )}

            {hasContext && (
              <Badge variant="outline" className="text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                Connected
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="space-y-2">
          {automations.map((automation) => (
            <AutomationItem
              key={automation.id}
              automation={automation}
              isRunning={runningAutomationId === automation.id}
              isExpanded={expandedId === automation.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === automation.id ? null : automation.id)
              }
              onRun={() => onRun(automation.id)}
              onEdit={() => onEditClick(automation)}
            />
          ))}
        </div>

        <button
          onClick={onCreateClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 mt-3 rounded-lg border border-dashed border-border/60 hover:border-border hover:bg-muted/30 transition-all text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Another
        </button>
      </div>
    </div>
  );
}
