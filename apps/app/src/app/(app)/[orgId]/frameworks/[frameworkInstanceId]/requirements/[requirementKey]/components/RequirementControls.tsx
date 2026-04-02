'use client';

import type { Control, RequirementMap, Task } from '@db';
import { Heading } from '@trycompai/design-system';
import { RequirementControlsTable } from './table/RequirementControlsTable';

interface EvidenceSubmissionInfo {
  id: string;
  formType: string;
  createdAt: Date | string;
}

interface RequirementControlsProps {
  tasks: (Task & { controls: Control[] })[];
  relatedControls: (RequirementMap & { control: Control & { policies: Array<{ id: string; name: string; status: string }> } } )[];
  evidenceSubmissions?: EvidenceSubmissionInfo[];
  frameworkInstanceId: string;
}

export function RequirementControls({
  tasks,
  relatedControls,
  evidenceSubmissions = [],
  frameworkInstanceId,
}: RequirementControlsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Heading level="3">Controls</Heading>
        <span className="text-muted-foreground bg-muted/50 rounded-xs px-2 py-1 text-xs tabular-nums">
          {relatedControls.length}
        </span>
      </div>

      <RequirementControlsTable
        controls={relatedControls.map((rc) => rc.control)}
        tasks={tasks}
        evidenceSubmissions={evidenceSubmissions}
        frameworkInstanceId={frameworkInstanceId}
      />
    </div>
  );
}
