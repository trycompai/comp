import { cn } from '@comp/ui/cn';
import type { TaskStatus } from '@db';
import { BadgeCheck, Circle, CircleDashed, Loader2, OctagonX } from 'lucide-react';

interface TaskStatusIndicatorProps {
  status: TaskStatus;
  className?: string;
}

export function TaskStatusIndicator({ status, className }: TaskStatusIndicatorProps) {
  let Icon = CircleDashed;
  let iconClass = 'text-muted-foreground';

  if (status === 'in_progress') {
    Icon = Loader2;
    iconClass = 'text-blue-400';
  } else if (status === 'done') {
    Icon = BadgeCheck;
    iconClass = 'text-primary';
  } else if (status === 'failed') {
    Icon = OctagonX;
    iconClass = 'text-red-500';
  } else if (status === 'not_relevant') {
    Icon = Circle;
    iconClass = 'text-muted-foreground/70';
  }

  return <Icon className={cn('h-4 w-4', iconClass, className)} strokeWidth={1.5} />;
}
