'use client';

import { downloadAllEvidenceZip } from '@/lib/evidence-download';
import type { Member, Task, User } from '@db';
import {
  Button,
  PageHeader,
  PageLayout,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  Switch,
} from '@trycompai/design-system';
import { Add, ArrowDown } from '@trycompai/design-system/icons';
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
  orgId: string;
  organizationName: string | null;
  hasEvidenceExportAccess: boolean;
}

export function TasksPageClient({
  tasks,
  members,
  controls,
  activeTab,
  orgId,
  organizationName,
  hasEvidenceExportAccess,
}: TasksPageClientProps) {
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [includeRawJson, setIncludeRawJson] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleDownloadAllEvidence = async () => {
    setIsDownloadingAll(true);
    try {
      await downloadAllEvidenceZip({
        organizationId: orgId,
        organizationName: organizationName ?? undefined,
        includeJson: includeRawJson,
      });
      setIsPopoverOpen(false);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <PageLayout
      header={
        <PageHeader
          title="Evidence"
          actions={
            <div className="flex items-center gap-2">
              {hasEvidenceExportAccess && (
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger style={{ cursor: 'pointer' }}>
                    <Button variant="outline">Export All Evidence</Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" side="bottom" sideOffset={8}>
                    <PopoverHeader>
                      <PopoverTitle>Export Options</PopoverTitle>
                      <PopoverDescription>Download all task evidence as ZIP</PopoverDescription>
                    </PopoverHeader>
                    <div className="flex items-center justify-between gap-3 py-1">
                      <span className="text-sm">Include raw JSON files</span>
                      <Switch
                        checked={includeRawJson}
                        onCheckedChange={(checked) => setIncludeRawJson(checked)}
                      />
                    </div>
                    <Button
                      iconLeft={<ArrowDown />}
                      onClick={handleDownloadAllEvidence}
                      disabled={isDownloadingAll}
                      width="full"
                    >
                      {isDownloadingAll ? 'Preparing…' : 'Export'}
                    </Button>
                  </PopoverContent>
                </Popover>
              )}
              <Button iconLeft={<Add />} onClick={() => setIsCreateSheetOpen(true)}>
                Create Evidence
              </Button>
            </div>
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
