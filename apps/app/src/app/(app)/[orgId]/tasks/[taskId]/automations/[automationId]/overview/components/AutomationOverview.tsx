'use client';

import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { EvidenceAutomation, EvidenceAutomationRun, Task } from '@db';
import { ArrowLeft, Cog, Edit, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  DeleteAutomationDialog,
  EditDescriptionDialog,
  EditNameDialog,
} from '../../../../automation/[automationId]/components/AutomationSettingsDialogs';
import { AutomationRunsCard } from '../../../../components/AutomationRunsCard';

type RunWithAutomationName = EvidenceAutomationRun & {
  evidenceAutomation: {
    name: string;
  };
};

interface AutomationOverviewProps {
  task: Task;
  automation: EvidenceAutomation;
  initialRuns: RunWithAutomationName[];
}

export function AutomationOverview({ task, automation, initialRuns }: AutomationOverviewProps) {
  const { orgId, taskId, automationId } = useParams<{
    orgId: string;
    taskId: string;
    automationId: string;
  }>();

  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editDescriptionOpen, setEditDescriptionOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Transform runs to include automation name
  const runsWithName = initialRuns.map((run) => ({
    ...run,
    evidenceAutomation: {
      name: automation.name,
    },
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/${orgId}/tasks/${taskId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to task
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">{automation.name}</h1>
            {automation.description && (
              <p className="text-muted-foreground">{automation.description}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Cog className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setEditNameOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditDescriptionOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Description
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Automation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-6">
        {/* Automation Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Details
              </CardTitle>
              <Link href={`/${orgId}/tasks/${taskId}/automation/${automationId}`}>
                <Button size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Automation
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Task</p>
              <p className="text-sm">{task.title}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Automation Name</p>
              <p className="text-sm">{automation.name}</p>
            </div>
            {automation.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{automation.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Execution History */}
        <AutomationRunsCard runs={runsWithName} />
      </div>

      {/* Settings Dialogs */}
      <EditNameDialog open={editNameOpen} onOpenChange={setEditNameOpen} />
      <EditDescriptionDialog open={editDescriptionOpen} onOpenChange={setEditDescriptionOpen} />
      <DeleteAutomationDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} />
    </div>
  );
}
