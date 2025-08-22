'use client';

import { StatusIndicator } from '@/components/status-indicator';
import { Button } from '@comp/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import type {
  Control,
  FrameworkEditorFramework,
  FrameworkEditorRequirement,
  FrameworkInstance,
  Policy,
  RequirementMap,
  Task,
} from '@db';
import { MoreVertical, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ControlProgressResponse } from '../data/getOrganizationControlProgress';
import { ControlDeleteDialog } from './ControlDeleteDialog';
import { PoliciesTable } from './PoliciesTable';
import { RequirementsTable } from './RequirementsTable';
import { SingleControlSkeleton } from './SingleControlSkeleton';
import { TasksTable } from './TasksTable';

interface SingleControlProps {
  control: Control & {
    requirementsMapped: (RequirementMap & {
      frameworkInstance: FrameworkInstance & {
        framework: FrameworkEditorFramework;
      };
      requirement: FrameworkEditorRequirement;
    })[];
  };
  controlProgress: ControlProgressResponse;
  relatedPolicies: Policy[];
  relatedTasks: Task[];
}

export function SingleControl({
  control,
  controlProgress,
  relatedPolicies,
  relatedTasks,
}: SingleControlProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const params = useParams<{ orgId: string; controlId: string }>();
  const orgIdFromParams = params.orgId;
  const controlIdFromParams = params.controlId;

  const progressStatus = useMemo(() => {
    if (!controlProgress) return 'not_started';
    if (controlProgress.total === controlProgress.completed) return 'completed';
    if (controlProgress.completed > 0) return 'in_progress';

    // Check if any task is not "todo" or any policy is not "draft"
    const anyTaskInProgress = relatedTasks.some((task) => task.status !== 'todo');
    const anyPolicyInProgress = relatedPolicies.some((policy) => policy.status !== 'draft');
    if (anyTaskInProgress || anyPolicyInProgress) return 'in_progress';

    return 'not_started';
  }, [controlProgress, relatedPolicies, relatedTasks]);

  if (!control || !controlProgress) {
    return <SingleControlSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <h1 className="truncate text-xl font-semibold">{control.name}</h1>
              <StatusIndicator status={progressStatus} />
            </div>
            {control.description && (
              <p className="text-muted-foreground text-sm leading-relaxed">{control.description}</p>
            )}
          </div>
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setDropdownOpen(false);
                  setDeleteDialogOpen(true);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <span>Policies</span>
            <span className="bg-muted/50 rounded-xs px-1.5 py-0.5 text-xs tabular-nums">
              {relatedPolicies.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <span>Tasks</span>
            <span className="bg-muted/50 rounded-xs px-1.5 py-0.5 text-xs tabular-nums">
              {relatedTasks.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="requirements" className="flex items-center gap-2">
            <span>Requirements</span>
            <span className="bg-muted/50 rounded-xs px-1.5 py-0.5 text-xs tabular-nums">
              {control.requirementsMapped.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-0">
          <PoliciesTable
            policies={relatedPolicies}
            orgId={orgIdFromParams}
            controlId={controlIdFromParams}
          />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-0">
          <TasksTable
            tasks={relatedTasks}
            orgId={orgIdFromParams}
            controlId={controlIdFromParams}
          />
        </TabsContent>

        <TabsContent value="requirements" className="space-y-0">
          <RequirementsTable requirements={control.requirementsMapped} orgId={orgIdFromParams} />
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <ControlDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        control={control}
      />
    </div>
  );
}
