'use client';

import type { Control, EvidenceAutomation, EvidenceAutomationRun, Member, Task, User } from '@db';
import { Check, Circle, Loader2, XCircle } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { AutomationIndicator } from './AutomationIndicator';
import { TaskStatusSelector } from './TaskStatusSelector';

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
}

const statusConfig = {
  todo: { icon: Circle, label: 'Todo', color: 'text-slate-400' },
  in_progress: { icon: Loader2, label: 'In Progress', color: 'text-blue-500' },
  done: { icon: Check, label: 'Done', color: 'text-emerald-500' },
  failed: { icon: XCircle, label: 'Failed', color: 'text-red-500' },
  not_relevant: { icon: Circle, label: 'Not Relevant', color: 'text-slate-500' },
} as const;

export function ModernTaskList({ tasks, members, statusFilter }: ModernTaskListProps) {
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

  const assignedMember = (task: Task) => {
    if (!task.assigneeId) return null;
    return members.find((m) => m.id === task.assigneeId);
  };

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
        const StatusIcon = config.icon;

        return (
          <div key={status} className="space-y-2">
            <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2">
              <StatusIcon className={`h-4 w-4 ${config.color}`} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                {config.label}
              </h3>
              <span className="text-slate-400 text-xs font-medium">({statusTasks.length})</span>
            </div>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200/60 bg-white">
              {statusTasks.map((task, index) => {
                const member = assignedMember(task);
                const isNotRelevant = task.status === 'not_relevant';
                return (
                  <div
                    key={task.id}
                    className={`group relative flex items-center gap-4 p-4 transition-colors cursor-pointer ${
                      isNotRelevant
                        ? 'opacity-50 bg-slate-100/50 backdrop-blur-md hover:bg-slate-100/60'
                        : 'hover:bg-slate-50/50'
                    }`}
                    onClick={() => handleTaskClick(task.id)}
                  >
                    {isNotRelevant && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold uppercase tracking-[0.15em] text-slate-600">
                          NOT RELEVANT
                        </span>
                      </div>
                    )}
                    <div
                      className="flex shrink-0 items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TaskStatusSelector task={task} />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`text-sm font-semibold ${isNotRelevant ? 'text-slate-500' : 'text-slate-900'}`}>
                            {task.title}
                          </div>
                          <AutomationIndicator
                            automations={task.evidenceAutomations}
                            variant="inline"
                          />
                        </div>
                        {task.description && (
                          <div className={`mt-0.5 line-clamp-1 text-xs ${isNotRelevant ? 'text-slate-400' : 'text-slate-500'}`}>
                            {task.description}
                          </div>
                        )}
                      </div>
                      {member && (
                        <div className="flex shrink-0 items-center">
                          <div className="bg-slate-100 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-slate-200">
                            {member.user?.image ? (
                              <Image
                                src={member.user.image}
                                alt={member.user.name ?? 'Assignee'}
                                width={32}
                                height={32}
                                className="object-cover"
                              />
                            ) : (
                              <span className="text-slate-600 text-xs font-medium">
                                {member.user?.name?.charAt(0) ?? '?'}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
