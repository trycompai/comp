'use client';

import { UpdateTaskForm } from '@/components/forms/risks/task/update-task-form';
import { TaskOverviewSheet } from '@/components/sheets/task-overview-sheet';
import { Alert, AlertDescription, AlertTitle } from '@comp/ui/alert';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import type { Task, User } from '@db';
import { PencilIcon, ShieldAlert } from 'lucide-react';
import { useQueryState } from 'nuqs';

export function TaskOverview({ task, users }: { task: Task; users: User[] }) {
  const [open, setOpen] = useQueryState('task-overview-sheet');

  return (
    <div className="space-y-4">
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>
          <div className="flex items-center justify-between gap-2">
            {task.title}
            <Button
              size="icon"
              variant="ghost"
              className="m-0 size-auto p-0"
              onClick={() => setOpen('true')}
            >
              <PencilIcon className="h-3 w-3" />
            </Button>
          </div>
        </AlertTitle>
        <AlertDescription className="mt-4">{task.description}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center justify-between gap-2">{'Overview'}</div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UpdateTaskForm task={task} users={users} />
        </CardContent>
      </Card>

      <TaskOverviewSheet task={task} />
    </div>
  );
}
