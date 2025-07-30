'use client';

import { Alert, AlertDescription, AlertTitle } from '@comp/ui/alert';
import { Button } from '@comp/ui/button';
import { Icons } from '@comp/ui/icons';
import { Sheet, SheetContent } from '@comp/ui/sheet';
import type { Member, Task, User } from '@db';
import { PencilIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useQueryState } from 'nuqs';

// Dynamically import the UpdateTaskSheet component
const UpdateTaskSheet = dynamic(
  () => import('./update-task-sheet').then((mod) => mod.UpdateTaskSheet),
  { ssr: false, loading: () => <div>Loading...</div> },
);

interface TitleProps {
  task: Task & {
    assignee: { user: User } | null;
  };
  assignees: (Member & { user: User })[];
}

export default function Title({ task, assignees }: TitleProps) {
  const [isOpen, setOpen] = useQueryState('task-overview-sheet');
  const open = isOpen === 'true';

  return (
    <div className="space-y-4">
      <Alert>
        <Icons.Risk className="h-4 w-4" />
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

      <Sheet open={open} onOpenChange={(isOpen) => setOpen(isOpen ? 'true' : null)}>
        <SheetContent className="sm:max-w-md md:max-w-lg lg:max-w-xl">
          {open && <UpdateTaskSheet task={task} assignees={assignees} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
