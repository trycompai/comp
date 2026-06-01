'use client';

import { getRequirementStatus } from '@/lib/control-compliance';
import { Badge, TableCell, TableRow, Text } from '@trycompai/design-system';
import { Launch } from '@trycompai/design-system/icons';
import Link from 'next/link';
import type { RequirementItem } from './framework-controls-shared';

export function GroupedRequirementRow({
  item,
  orgId,
  frameworkInstanceId,
  onRowClick,
}: {
  item: RequirementItem;
  orgId: string;
  frameworkInstanceId: string;
  onRowClick: (requirementId: string) => void;
}) {
  const status = getRequirementStatus(item.controlStatuses);
  const identifier = item.identifier?.trim();
  const href = `/${orgId}/frameworks/${frameworkInstanceId}/requirements/${item.id}`;

  return (
    <TableRow onClick={() => onRowClick(item.id)} style={{ cursor: 'pointer' }}>
      <TableCell>
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="group flex items-center gap-2 pl-6"
        >
          <span className="text-sm">{identifier || '—'}</span>
          <Launch
            size={14}
            className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          />
        </Link>
      </TableCell>
      <TableCell>
        <span className="block truncate text-sm" title={item.name}>
          {item.name}
        </span>
      </TableCell>
      <TableCell>
        <span className="block truncate text-sm" title={item.description || ''}>
          {item.description || '—'}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-1.5 min-w-0 flex-1 rounded-full bg-muted/50">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${item.compliancePercent}%` }}
            />
          </div>
          <div className="tabular-nums w-10 text-right">
            <Text size="sm" variant="muted">
              {item.compliancePercent}%
            </Text>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={status.variant}>{status.label}</Badge>
      </TableCell>
      <TableCell>
        <div className="tabular-nums">
          <Text size="sm" variant="muted">
            {item.satisfiedControlsCount}/{item.mappedControlsCount}
          </Text>
        </div>
      </TableCell>
      <TableCell>
        <div className="tabular-nums">
          <Text size="sm" variant="muted">
            {item.artifactCounts.policies.completed}/{item.artifactCounts.policies.total}
          </Text>
        </div>
      </TableCell>
      <TableCell>
        <div className="tabular-nums">
          <Text size="sm" variant="muted">
            {item.artifactCounts.tasks.completed}/{item.artifactCounts.tasks.total}
          </Text>
        </div>
      </TableCell>
      <TableCell>
        <div className="tabular-nums">
          <Text size="sm" variant="muted">
            {item.artifactCounts.documents.completed}/{item.artifactCounts.documents.total}
          </Text>
        </div>
      </TableCell>
    </TableRow>
  );
}
