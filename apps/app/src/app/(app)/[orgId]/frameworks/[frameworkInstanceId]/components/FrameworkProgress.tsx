'use client';

import type { Control, Task } from '@db';
import { Badge, Text } from '@trycompai/design-system';
import {
  type EvidenceSubmissionInfo,
  getControlStatus,
  getFrameworkAggregatePercent,
} from '@/lib/control-compliance';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';

interface Props {
  framework: FrameworkInstanceWithControls;
  tasks: (Task & { controls: Control[] })[];
  evidenceSubmissions: EvidenceSubmissionInfo[];
}

export function FrameworkProgress({ framework, tasks, evidenceSubmissions }: Props) {
  const allControls = framework.controls ?? [];
  const totalControls = allControls.length;

  const compliantControls = allControls.filter(
    (control) =>
      getControlStatus(
        control.policies,
        tasks,
        control.id,
        control.controlDocumentTypes,
        evidenceSubmissions,
      ) === 'completed',
  ).length;

  const percent = getFrameworkAggregatePercent(allControls, tasks, evidenceSubmissions);
  const remaining = totalControls - compliantControls;

  const variant: 'default' | 'secondary' | 'destructive' =
    percent >= 80 ? 'default' : percent >= 60 ? 'secondary' : 'destructive';

  return (
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
  );
}
