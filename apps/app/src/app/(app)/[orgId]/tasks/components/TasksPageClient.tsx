'use client';

import { UpdateOrganizationEvidenceApproval } from '@/components/forms/organization/update-organization-evidence-approval';
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
  Tabs,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { Add, ArrowDown } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { toast } from 'sonner';
import type { FrameworkInstanceForTasks } from '../types';
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
  frameworkInstances: FrameworkInstanceForTasks[];
  activeTab: 'categories' | 'list';
  orgId: string;
  organizationName: string | null;
  hasEvidenceExportAccess: boolean;
  evidenceApprovalEnabled: boolean;
}

export function TasksPageClient({
  tasks,
  members,
  controls,
  frameworkInstances,
  activeTab,
  orgId,
  organizationName,
  hasEvidenceExportAccess,
  evidenceApprovalEnabled,
}: TasksPageClientProps) {
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [includeRawJson, setIncludeRawJson] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [mainTab, setMainTab] = useState('evidence-list');

  const handleDownloadAllEvidence = async () => {
    setIsDownloadingAll(true);
    try {
      await downloadAllEvidenceZip({
        organizationId: orgId,
        organizationName: organizationName ?? undefined,
        includeJson: includeRawJson,
      });
      toast.success('Evidence package downloaded successfully');
      setIsPopoverOpen(false);
    } catch (err) {
      const noEvidence = err instanceof Error && err.message?.includes('No tasks with evidence found');
      if (noEvidence) {
        toast.info('No tasks with evidence found to export.');
      } else {
        toast.error('Failed to download evidence. Please try again.');
      }
      console.error('Evidence download error:', err);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <Tabs defaultValue="evidence-list" onValueChange={setMainTab}>
    <PageLayout
      header={
        <PageHeader
          title="Evidence"
          actions={
            <div className="flex items-center gap-2">
              {hasEvidenceExportAccess && (
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-7 px-2 cursor-pointer">
                    Export All Evidence
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
      <TaskList
        tasks={tasks}
        members={members}
        frameworkInstances={frameworkInstances}
        activeTab={activeTab}
        evidenceApprovalEnabled={evidenceApprovalEnabled}
        afterAnalytics={
          <div className="w-fit">
            <TabsList variant="underline">
              <TabsTrigger value="evidence-list">Overview</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </div>
        }
        showFiltersAndList={mainTab === 'evidence-list'}
      />
      {mainTab === 'settings' && (
        <UpdateOrganizationEvidenceApproval
          evidenceApprovalEnabled={evidenceApprovalEnabled}
        />
      )}
      <CreateTaskSheet
        members={members}
        controls={controls}
        open={isCreateSheetOpen}
        onOpenChange={setIsCreateSheetOpen}
      />
    </PageLayout>
    </Tabs>
  );
}
