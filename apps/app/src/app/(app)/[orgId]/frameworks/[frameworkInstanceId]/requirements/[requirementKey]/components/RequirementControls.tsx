'use client';

import type { Control, RequirementMap, Task } from '@db';
import { Badge, Heading, Text } from '@trycompai/design-system';
import {
  type EvidenceSubmissionInfo,
  getControlStatus,
  getFrameworkAggregatePercent,
} from '@/lib/control-compliance';
import { RequirementControlsTable } from './table/RequirementControlsTable';

type ControlWithRelations = Control & {
  policies?: Array<{ id: string; name: string; status: string }>;
  controlDocumentTypes?: Array<{ formType: string }>;
};

interface RequirementControlsProps {
  tasks: (Task & { controls: Control[] })[];
  relatedControls: (RequirementMap & { control: ControlWithRelations })[];
  evidenceSubmissions?: EvidenceSubmissionInfo[];
  frameworkInstanceId: string;
}

export function RequirementControls({
  tasks,
  relatedControls,
  evidenceSubmissions = [],
  frameworkInstanceId,
}: RequirementControlsProps) {
  const controls = relatedControls.map((rc) => rc.control);
  const totalControls = controls.length;
  const compliantControls = controls.filter(
    (control) =>
      getControlStatus(
        control.policies ?? [],
        tasks,
        control.id,
        control.controlDocumentTypes,
        evidenceSubmissions,
      ) === 'completed',
  ).length;
  const remaining = totalControls - compliantControls;
  const percent = getFrameworkAggregatePercent(controls, tasks, evidenceSubmissions);
  const variant: 'default' | 'secondary' | 'destructive' =
    percent >= 80 ? 'default' : percent >= 60 ? 'secondary' : 'destructive';

  return (
    <div className="space-y-4">
      {totalControls > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <Badge variant={variant}>{percent}% compliant</Badge>
            <Text size="sm" variant="muted">
              {compliantControls} completed
            </Text>
            <Text size="sm" variant="muted">
              {remaining} remaining
            </Text>
            <Text size="sm" variant="muted">
              {totalControls} total controls
            </Text>
          </div>
          <div className="h-2 w-full rounded-full bg-muted/50">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Heading level="3">Controls</Heading>
        <span className="text-muted-foreground bg-muted/50 rounded-xs px-2 py-1 text-xs tabular-nums">
          {totalControls}
        </span>
      </div>

      <RequirementControlsTable
        controls={controls}
        tasks={tasks}
        evidenceSubmissions={evidenceSubmissions}
        frameworkInstanceId={frameworkInstanceId}
      />
    </div>
  );
}
