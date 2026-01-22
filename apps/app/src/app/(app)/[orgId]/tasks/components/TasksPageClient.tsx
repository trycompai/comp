'use client';

import { Button, PageHeader, PageLayout } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import type { Member, Task, User } from '@db';
import { useState } from 'react';
import { CreateTaskSheet } from './CreateTaskSheet';
import { TaskList } from './TaskList';

interface TasksPageClientProps {
  tasks: (Task & {
    controls: { id: string; name: string }[];
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
  controls: { id: string; name: string }[];
  activeTab: 'categories' | 'list';
}

export function TasksPageClient({ tasks, members, controls, activeTab }: TasksPageClientProps) {
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

  return (
    <PageLayout
      header={
        <PageHeader
          title="Evidence"
          actions={
            <Button iconLeft={<Add />} onClick={() => setIsCreateSheetOpen(true)}>
              Create Evidence
            </Button>
          }
        />
      }
      padding="default"
    >
      <TaskList tasks={tasks} members={members} activeTab={activeTab} />
      <CreateTaskSheet
        members={members}
        controls={controls}
        open={isCreateSheetOpen}
        onOpenChange={setIsCreateSheetOpen}
      />
    </PageLayout>
  );
}
