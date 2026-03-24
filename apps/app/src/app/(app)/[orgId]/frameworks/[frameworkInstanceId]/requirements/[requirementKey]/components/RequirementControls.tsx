'use client';

import type { Control, FrameworkEditorRequirement, RequirementMap, Task } from '@db';
import { useParams, useRouter } from 'next/navigation';
import { RequirementControlsTable } from './table/RequirementControlsTable';
import { CreateControlForRequirementSheet } from './CreateControlForRequirementSheet';

interface RequirementControlsProps {
  requirement: FrameworkEditorRequirement & { frameworkInstanceId?: string };
  tasks: (Task & { controls: Control[] })[];
  relatedControls: (RequirementMap & { control: Control })[];
  isInstanceRequirement?: boolean;
  availableTasks?: { id: string; title: string }[];
  availablePolicies?: { id: string; name: string }[];
}

export function RequirementControls({
  requirement,
  tasks,
  relatedControls,
  isInstanceRequirement = false,
  availableTasks = [],
  availablePolicies = [],
}: RequirementControlsProps) {
  const router = useRouter();
  const { frameworkInstanceId } = useParams<{ frameworkInstanceId: string }>();

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
          <CreateControlForRequirementSheet
            requirementId={requirement.id}
            frameworkInstanceId={frameworkInstanceId}
            isInstanceRequirement={isInstanceRequirement}
            onCreated={() => router.refresh()}
            availableTasks={availableTasks}
            availablePolicies={availablePolicies}
          />
        </div>

        <RequirementControlsTable
          controls={relatedControls.map((control) => control.control)}
          tasks={tasks}
        />
      </div>
    </div>
  );
}
