'use client';

import type { Member, Task, User } from '@db';
import { Check, Circle, Loader2, XCircle } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { ModernSingleStatusTaskList } from './ModernSingleStatusTaskList';

interface ModernTaskListProps {
  tasks: (Task & {
    controls?: { id: string; name: string }[];
    evidenceAutomations?: Array<{
      id: string;
      isEnabled: boolean;
      name: string;
      runs?: Array<{
        status: string;
        success: boolean | null;
        evaluationStatus: string | null;
        createdAt: Date;
        triggeredBy: string;
        runDuration: number | null;
      }>;
    }>;
  })[];
  members: (Member & { user: User })[];
  statusFilter?: string | null;
  mutateTasks: () => Promise<unknown>;
}

const statusConfig = {
  todo: { icon: Circle, label: 'Todo', color: 'text-slate-400' },
  in_progress: { icon: Loader2, label: 'In Progress', color: 'text-blue-500' },
  done: { icon: Check, label: 'Done', color: 'text-emerald-500' },
  failed: { icon: XCircle, label: 'Failed', color: 'text-red-500' },
  not_relevant: { icon: Circle, label: 'Not Relevant', color: 'text-slate-500' },
} as const;

export function ModernTaskList({ tasks, members, statusFilter, mutateTasks }: ModernTaskListProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, typeof tasks> = {
      todo: [],
      in_progress: [],
      done: [],
      failed: [],
      not_relevant: [],
    };

    for (const task of tasks) {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    }

    // Sort each group by title
    Object.keys(grouped).forEach((status) => {
      grouped[status].sort((a, b) => a.title.localeCompare(b.title));
    });

    return grouped;
  }, [tasks]);

  const handleTaskClick = (taskId: string) => {
    router.push(`${pathname}/${taskId}`);
  };

  const statusOrder: Array<keyof typeof statusConfig> = [
    'todo',
    'in_progress',
    'done',
    'failed',
    'not_relevant',
  ];

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 text-5xl">✨</div>
        <h3 className="text-lg font-semibold text-slate-900">No tasks found</h3>
        <p className="text-slate-500 mt-2 text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {statusOrder.map((status) => {
        const statusTasks = tasksByStatus[status];
        if (statusTasks.length === 0) return null;

        const config = statusConfig[status];

        return (
          <ModernSingleStatusTaskList key={status} config={config} tasks={statusTasks} members={members} handleTaskClick={handleTaskClick} mutateTasks={mutateTasks} />
        );
      })}
    </div>
  );
}
