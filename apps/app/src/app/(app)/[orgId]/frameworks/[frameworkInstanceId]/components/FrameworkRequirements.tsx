'use client';

import type { StatusType } from '@/components/status-indicator';
import {
  type EvidenceSubmissionInfo,
  type RequirementArtifactCounts,
  getControlProgressPercent,
  getControlStatus,
  getRequirementArtifactCounts,
  getRequirementCompliancePercent,
  getRequirementStatus,
} from '@/lib/control-compliance';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';
import type { Control, FrameworkEditorRequirement, Task } from '@db';
import {
  Badge,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Search } from '@trycompai/design-system/icons';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ExpandableDescription } from './ExpandableDescription';
import { compareRequirementsByOrder } from './framework-controls-shared';
import {
  REQUIREMENTS_TABLE_COLUMN_COUNT,
  REQUIREMENTS_TABLE_STYLE,
  RequirementsTableColumnGroup,
  RequirementsTableHeader,
} from './requirements-table-layout';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface RequirementItem extends FrameworkEditorRequirement {
  mappedControlsCount: number;
  satisfiedControlsCount: number;
  compliancePercent: number;
  controlStatuses: StatusType[];
  artifactCounts: RequirementArtifactCounts;
}

export function FrameworkRequirements({
  requirementDefinitions,
  frameworkInstanceWithControls,
  tasks,
  evidenceSubmissions = [],
}: {
  requirementDefinitions: FrameworkEditorRequirement[];
  frameworkInstanceWithControls: FrameworkInstanceWithControls;
  tasks?: (Task & { controls: Control[] })[];
  evidenceSubmissions?: EvidenceSubmissionInfo[];
}) {
  const router = useRouter();
  const { orgId, frameworkInstanceId } = useParams<{
    orgId: string;
    frameworkInstanceId: string;
  }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const items = useMemo(() => {
    return requirementDefinitions.map((def) => {
      const mappedControls = frameworkInstanceWithControls.controls.filter(
        (control) =>
          control.requirementsMapped?.some((reqMap) => reqMap.requirementId === def.id) ?? false,
      );

      const controlStatuses = mappedControls.map((control) =>
        getControlStatus(
          control.policies,
          tasks ?? [],
          control.id,
          control.controlDocumentTypes,
          evidenceSubmissions,
        ),
      );
      const satisfiedControlsCount = controlStatuses.filter(
        (status) => status === 'completed',
      ).length;

      const controlProgressPercents = mappedControls.map((control) =>
        getControlProgressPercent(
          control.policies,
          tasks ?? [],
          control.id,
          control.controlDocumentTypes,
          evidenceSubmissions,
        ),
      );
      const compliancePercent = getRequirementCompliancePercent(controlProgressPercents);

      const artifactCounts = getRequirementArtifactCounts(
        mappedControls,
        tasks ?? [],
        evidenceSubmissions,
      );

      return {
        ...def,
        mappedControlsCount: mappedControls.length,
        satisfiedControlsCount,
        compliancePercent,
        controlStatuses,
        artifactCounts,
      };
    });
  }, [requirementDefinitions, frameworkInstanceWithControls.controls, tasks, evidenceSubmissions]);

  // FRAME-18: order by the framework's configured sort order (numbered first,
  // unset last), falling back to identifier for ties.
  const sortedItems = useMemo(() => [...items].sort(compareRequirementsByOrder), [items]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return sortedItems;
    const lowerSearch = searchTerm.toLowerCase();
    return sortedItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.identifier?.toLowerCase().includes(lowerSearch) ||
        item.description?.toLowerCase().includes(lowerSearch),
    );
  }, [items, searchTerm]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(
    () => filteredItems.slice((page - 1) * pageSize, page * pageSize),
    [filteredItems, page, pageSize],
  );

  // Snap back to page 1 when filtering or page-size changes shrink the result set.
  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  const handleRowClick = (requirementId: string) => {
    router.push(`/${orgId}/frameworks/${frameworkInstanceId}/requirements/${requirementId}`);
  };

  return (
    <div className="space-y-4">
      <div className="w-full max-w-sm">
        <InputGroup>
          <InputGroupAddon>
            <Search size={16} />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search requirements..."
            value={searchTerm}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSearchTerm(event.target.value)
            }
          />
        </InputGroup>
      </div>
      <Table
        variant="bordered"
        style={REQUIREMENTS_TABLE_STYLE}
        pagination={{
          page,
          pageCount,
          onPageChange: setPage,
          pageSize,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
        }}
      >
        <RequirementsTableColumnGroup />
        <RequirementsTableHeader />
        <TableBody>
          {paginatedItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={REQUIREMENTS_TABLE_COLUMN_COUNT}>
                <Text size="sm" variant="muted">
                  No requirements found.
                </Text>
              </TableCell>
            </TableRow>
          ) : (
            paginatedItems.map((item) => {
              const status = getRequirementStatus(item.controlStatuses);
              const identifier = item.identifier?.trim();

              return (
                <TableRow
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRowClick(item.id)}
                  onKeyDown={(event: React.KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleRowClick(item.id);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <span className="text-sm">{identifier || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="block truncate text-sm" title={item.name}>
                      {item.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ExpandableDescription
                      description={item.description}
                      identifier={item.identifier}
                      name={item.name}
                    />
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
                        {item.artifactCounts.policies.completed}/
                        {item.artifactCounts.policies.total}
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
                        {item.artifactCounts.documents.completed}/
                        {item.artifactCounts.documents.total}
                      </Text>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
