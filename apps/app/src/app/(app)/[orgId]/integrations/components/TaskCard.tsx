'use client';

import { api } from '@/lib/api-client';
import { Skeleton } from '@comp/ui/skeleton';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface RelevantTask {
  taskTemplateId: string;
  taskName: string;
  reason: string;
  prompt: string;
}

export function TaskCard({ task, orgId }: { task: RelevantTask; orgId: string }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const handleCardClick = async () => {
    setIsNavigating(true);
    toast.loading('Opening task automation...', { id: 'navigating' });

    try {
      const response = await api.get<Array<{ id: string; taskTemplateId: string | null }>>(
        '/v1/tasks',
        orgId,
      );

      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to fetch tasks');
      }

      const matchingTask = response.data.find(
        (t) => t.taskTemplateId && t.taskTemplateId === task.taskTemplateId,
      );

      if (!matchingTask) {
        toast.dismiss('navigating');
        toast.error(`Task "${task.taskName}" not found. Please create it first.`);
        setIsNavigating(false);
        await router.push(`/${orgId}/tasks`);
        return;
      }

      const url = `/${orgId}/tasks/${matchingTask.id}/automation/new?prompt=${encodeURIComponent(task.prompt)}`;
      toast.dismiss('navigating');
      toast.success('Redirecting...', { duration: 1000 });

      window.location.href = url;
    } catch (error) {
      console.error('Error finding task:', error);
      toast.dismiss('navigating');
      toast.error('Failed to find task');
      setIsNavigating(false);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group/task relative block p-5 rounded-xl bg-gradient-to-br from-background to-muted/20 border border-border/60 hover:border-primary/40 hover:shadow-md transition-all duration-200 h-full overflow-hidden cursor-pointer"
    >
      {isNavigating && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3 rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">Opening task...</p>
            <p className="text-xs text-muted-foreground">
              Redirecting to automation with prompt pre-filled
            </p>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover/task:opacity-100 transition-opacity duration-200" />
      <div className="relative flex flex-col h-full">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 flex-shrink-0 group-hover/task:bg-primary transition-colors" />
              <p className="text-sm font-semibold text-foreground group-hover/task:text-primary transition-colors">
                {task.taskName}
              </p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 pl-3.5">
              {task.reason}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover/task:text-primary group-hover/task:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
        </div>
      </div>
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="p-5 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border-2 border-dashed border-muted-foreground/20 h-full animate-pulse">
      <div className="flex items-start justify-between gap-3 h-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-3">
            <Skeleton className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-muted-foreground/30" />
            <Skeleton className="h-4 w-32 bg-muted-foreground/30" />
          </div>
          <div className="pl-4 space-y-2.5">
            <Skeleton className="h-3 w-full bg-muted-foreground/25" />
            <Skeleton className="h-3 w-5/6 bg-muted-foreground/25" />
            <Skeleton className="h-3 w-4/6 bg-muted-foreground/25" />
          </div>
        </div>
        <Skeleton className="w-4 h-4 rounded-full bg-muted-foreground/30 mt-0.5 flex-shrink-0" />
      </div>
    </div>
  );
}

