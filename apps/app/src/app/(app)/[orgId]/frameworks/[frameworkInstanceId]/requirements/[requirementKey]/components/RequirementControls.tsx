'use client';

import { Button } from '@comp/ui/button';
import type { Control, FrameworkEditorRequirement, Member, RequirementMap, Task, User } from '@db';
import { Plus } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQueryState } from 'nuqs';
import { CreateControlSheet } from '../../../../../controls/components/CreateControlSheet';
import { CreateTaskSheet } from '../../../../../tasks/components/CreateTaskSheet';
import { RequirementControlsTable } from './table/RequirementControlsTable';

type RequirementMapping = {
  requirementId: string;
  frameworkInstanceId: string;
};

interface RequirementControlsProps {
  requirement: FrameworkEditorRequirement;
  tasks: (Task & { controls: Control[] })[];
  relatedControls: (RequirementMap & { control: Control })[];
  policies: { id: string; name: string }[];
  requirements: {
    id: string;
    name: string;
    identifier: string;
    frameworkInstanceId: string;
    frameworkName: string;
  }[];
  members: (Member & { user: User })[];
  controlSummaries: { id: string; name: string }[];
}

export function RequirementControls({
  requirement,
  tasks,
  relatedControls,
  policies,
  requirements,
  members,
  controlSummaries,
}: RequirementControlsProps) {
  const { frameworkInstanceId } = useParams<{ frameworkInstanceId: string }>();
  const [createControlOpen, setCreateControlOpen] = useQueryState('create-control');
  const [createTaskOpen, setCreateTaskOpen] = useQueryState('create-task');
  const [prefillRequirementMappings, setPrefillRequirementMappings] =
    useState<RequirementMapping[]>([]);
  const [taskPrefill, setTaskPrefill] = useState<{ title?: string; description?: string } | null>(
    null,
  );
  const [taskPrefillControls, setTaskPrefillControls] = useState<string[] | undefined>();
  const [availableControls, setAvailableControls] = useState(controlSummaries);

  const sheetTasks = useMemo(() => tasks.map((task) => ({ id: task.id, title: task.title })), [tasks]);
  const currentRequirementOption = useMemo(
    () => requirements.find((req) => req.id === requirement.id),
    [requirements, requirement.id],
  );

  const handleAddControl = () => {
    const mapping: RequirementMapping = {
      requirementId: requirement.id,
      frameworkInstanceId: currentRequirementOption?.frameworkInstanceId ?? frameworkInstanceId ?? '',
    };

    setPrefillRequirementMappings([mapping]);
    void setCreateControlOpen('true');
  };

  useEffect(() => {
    if (!createControlOpen) {
      setPrefillRequirementMappings([]);
    }
  }, [createControlOpen]);

  useEffect(() => {
    if (!createTaskOpen) {
      setTaskPrefill(null);
      setTaskPrefillControls(undefined);
    }
  }, [createTaskOpen]);

  useEffect(() => {
    setAvailableControls((prev) => {
      const dedup = new Map(prev.map((control) => [control.id, control]));
      for (const control of controlSummaries) {
        dedup.set(control.id, control);
      }
      return Array.from(dedup.values());
    });
  }, [controlSummaries]);

  const handleRequestCreateTask = ({
    control,
    prefill,
  }: {
    control: { id: string; name: string; description: string | null };
    prefill: { title?: string; description?: string };
  }) => {
    setAvailableControls((prev) => {
      if (prev.some((c) => c.id === control.id)) {
        return prev;
      }
      return [...prev, { id: control.id, name: control.name }];
    });
    setTaskPrefill(
      prefill ?? {
        title: control.name,
        description: control.description ?? undefined,
      },
    );
    setTaskPrefillControls([control.id]);
    void setCreateTaskOpen('true');
  };

  return (
    <div className="space-y-6">
      {/* Requirement Header */}
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">{requirement.name}</h1>
        {requirement.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">{requirement.description}</p>
        )}
      </div>

      {/* Controls Section */}
      <div className="space-y-4">
        <div className="border-muted flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium">Controls</h2>
            <span className="text-muted-foreground bg-muted/50 rounded-xs px-2 py-1 text-xs tabular-nums">
              {relatedControls.length}
            </span>
          </div>
          <Button variant="default" size="sm" onClick={handleAddControl}>
            <Plus className="mr-2 h-4 w-4" />
            Add Control
          </Button>
        </div>

        <RequirementControlsTable
          controls={relatedControls.map((control) => control.control)}
          tasks={tasks}
        />
      </div>

      <CreateControlSheet
        policies={policies}
        tasks={sheetTasks}
        requirements={requirements}
        prefillRequirementMappings={prefillRequirementMappings}
        onRequestCreateTask={handleRequestCreateTask}
      />

      <CreateTaskSheet
        members={members}
        controls={availableControls}
        prefillTask={taskPrefill || undefined}
        prefillControls={taskPrefillControls}
      />
    </div>
  );
}
