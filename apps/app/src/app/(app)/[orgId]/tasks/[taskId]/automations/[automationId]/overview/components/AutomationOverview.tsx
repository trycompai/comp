'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@comp/ui/breadcrumb';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { EvidenceAutomation, EvidenceAutomationRun, EvidenceAutomationVersion, Task } from '@db';
import { ChevronRight, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  DeleteAutomationDialog,
  EditDescriptionDialog,
  EditNameDialog,
} from '../../../../automation/[automationId]/components/AutomationSettingsDialogs';
import { AutomationRunsCard } from '../../../../components/AutomationRunsCard';
import { MetricsSection } from './MetricsSection';

type RunWithAutomationName = EvidenceAutomationRun & {
  evidenceAutomation: {
    name: string;
  };
};

interface AutomationOverviewProps {
  task: Task;
  automation: EvidenceAutomation;
  initialRuns: RunWithAutomationName[];
  initialVersions: EvidenceAutomationVersion[];
}

export function AutomationOverview({
  task,
  automation,
  initialRuns,
  initialVersions,
}: AutomationOverviewProps) {
  const { orgId, taskId, automationId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();

  console.log('[AUTOMATION OVERVIEW] automation', automation);

  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editDescriptionOpen, setEditDescriptionOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Transform runs to include automation name
  const runsWithName = useMemo(
    () =>
      initialRuns.map((run) => ({
        ...run,
        evidenceAutomation: {
          name: automation.name,
        },
      })),
    [initialRuns, automation.name],
  );

  return (
    <div>
      {/* Breadcrumb */}
      <div className="px-8 py-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href={`/${orgId}/tasks`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Tasks
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href={`/${orgId}/tasks/${taskId}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {task.title}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <span className="text-foreground font-medium">{automation.name}</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <MetricsSection
        automationName={automation.name}
        initialVersions={initialVersions}
        initialRuns={initialRuns}
      />

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-8 py-12">
        {/* Left Column - History */}
        <div className="lg:col-span-2">
          <AutomationRunsCard runs={runsWithName} />
        </div>

        {/* Right Column - Details & Versions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Details</CardTitle>
                <div className="flex items-center gap-2">
                  <Link href={`/${orgId}/tasks/${taskId}/automation/${automationId}`}>
                    <Button size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">Created</p>
                  <p className="text-sm">
                    {new Date(automation.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    at{' '}
                    {new Date(automation.createdAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground">Last Published</p>
                  <p className="text-sm">
                    {runsWithName[0]?.createdAt ? (
                      <>
                        {new Date(runsWithName[0].createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(runsWithName[0].createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </>
                    ) : (
                      'Never'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* <VersionsCard /> */}
        </div>
      </div>

      {/* Settings Dialogs */}
      <EditNameDialog open={editNameOpen} onOpenChange={setEditNameOpen} />
      <EditDescriptionDialog open={editDescriptionOpen} onOpenChange={setEditDescriptionOpen} />
      <DeleteAutomationDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} />
    </div>
  );
}
