'use client';

import {
  type EvidenceSubmissionInfo,
  getControlProgressPercent,
  getControlStatus,
  getRequirementArtifactCounts,
} from '@/lib/control-compliance';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';
import type { Control, Task } from '@db';
import { Badge, TableCell, TableRow, Text } from '@trycompai/design-system';
import { Launch } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { getStatusBadge } from './framework-controls-shared';

export function GroupedControlRow({
  control,
  requirements,
  tasks,
  evidenceSubmissions,
  orgId,
  frameworkInstanceId,
  onRowClick,
}: {
  control: FrameworkInstanceWithControls['controls'][number];
  requirements: Array<{ id: string; name: string; identifier: string }>;
  tasks: (Task & { controls: Control[] })[];
  evidenceSubmissions: EvidenceSubmissionInfo[];
  orgId: string;
  frameworkInstanceId: string;
  onRowClick: (controlId: string) => void;
}) {
  const policies = control.policies ?? [];
  const documentTypes = control.controlDocumentTypes ?? [];
  const counts = getRequirementArtifactCounts([control], tasks, evidenceSubmissions);
  const status = getControlStatus(policies, tasks, control.id, documentTypes, evidenceSubmissions);
  const badge = getStatusBadge(status);
  const compliancePercent = getControlProgressPercent(
    policies,
    tasks,
    control.id,
    documentTypes,
    evidenceSubmissions,
  );

  const controlHref = `/${orgId}/frameworks/${frameworkInstanceId}/controls/${control.id}`;

  const handleRowClick = () => {
    onRowClick(control.id);
  };

  const reqLabel =
    requirements.length > 0
      ? requirements.map((r) => r.identifier || r.name).join(', ')
      : null;

  return (
    <TableRow onClick={handleRowClick} style={{ cursor: 'pointer' }}>
      <TableCell>
        <Link
          href={controlHref}
          onClick={(e) => e.stopPropagation()}
          className="group flex items-center gap-2 pl-6"
        >
          <span className="block max-w-[280px] truncate text-sm" title={control.name}>
            {control.name}
          </span>
          <Launch
            size={14}
            className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          />
        </Link>
      </TableCell>
      <TableCell>
        {reqLabel ? (
          <span className="block max-w-[200px] truncate text-sm" title={reqLabel}>
            {reqLabel}
          </span>
        ) : (
          <Text size="sm" variant="muted">
            —
          </Text>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="flex-1 rounded-full bg-muted/50 h-1.5">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${compliancePercent}%` }}
            />
          </div>
          <div className="tabular-nums w-10 text-right">
            <Text size="sm" variant="muted">
              {compliancePercent}%
            </Text>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </TableCell>
      <TableCell>
        <div className="tabular-nums">
          <Text size="sm" variant="muted">
            {counts.policies.completed}/{counts.policies.total}
          </Text>
        </div>
      </TableCell>
      <TableCell>
        <div className="tabular-nums">
          <Text size="sm" variant="muted">
            {counts.tasks.completed}/{counts.tasks.total}
          </Text>
        </div>
      </TableCell>
      <TableCell>
        <div className="tabular-nums">
          <Text size="sm" variant="muted">
            {counts.documents.completed}/{counts.documents.total}
          </Text>
        </div>
      </TableCell>
    </TableRow>
  );
}
