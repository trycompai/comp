'use client';

import { Badge } from '@comp/ui/badge';
import { cn } from '@comp/ui/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@comp/ui/tooltip';
import type { TaskAutomationStatus } from '@db';

interface TaskAutomationStatusBadgeProps {
  status: TaskAutomationStatus;
  className?: string;
}

export function TaskAutomationStatusBadge({ status, className }: TaskAutomationStatusBadgeProps) {
  if (status === 'AUTOMATED') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                'inline-flex items-center gap-1.5 border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 cursor-help',
                className,
              )}
            >
              <span className="text-xs font-medium">Automated</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This task can be automated</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'inline-flex items-center gap-1.5 border-muted-foreground/20 bg-muted text-muted-foreground hover:bg-muted/80 cursor-help',
              className,
            )}
          >
            <span className="text-xs font-medium">Manual</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>This task requires manual execution and cannot be automated</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
