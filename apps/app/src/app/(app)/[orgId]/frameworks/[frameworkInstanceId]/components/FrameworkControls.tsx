'use client';

import {
  type EvidenceSubmissionInfo,
  getControlProgressPercent,
  getControlStatus,
  getRequirementArtifactCounts,
} from '@/lib/control-compliance';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';
import type { Control, FrameworkEditorRequirement, Task } from '@db';
import {
  buildControlItems,
  buildRequirementMap,
  type ControlItem,
  getStatusBadge,
  PAGE_SIZE_OPTIONS,
} from './framework-controls-shared';
import {
  Badge,

  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Launch, Search } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export function FrameworkControls({
  frameworkInstanceWithControls,
  requirementDefinitions,
  tasks,
  evidenceSubmissions = [],
}: {
  frameworkInstanceWithControls: FrameworkInstanceWithControls;
  requirementDefinitions: FrameworkEditorRequirement[];
  tasks: (Task & { controls: Control[] })[];
  evidenceSubmissions?: EvidenceSubmissionInfo[];
}) {
  const { orgId, frameworkInstanceId } = useParams<{
    orgId: string;
    frameworkInstanceId: string;
  }>();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const requirementMap = useMemo(
    () => buildRequirementMap(requirementDefinitions),
    [requirementDefinitions],
  );

  const items: ControlItem[] = useMemo(
    () => buildControlItems(frameworkInstanceWithControls.controls, requirementMap),
    [frameworkInstanceWithControls.controls, requirementMap],
  );

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const searchLower = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.control.name.toLowerCase().includes(searchLower) ||
        item.control.description?.toLowerCase().includes(searchLower) ||
        item.requirements.some(
          (r) =>
            r.name.toLowerCase().includes(searchLower) ||
            r.identifier.toLowerCase().includes(searchLower),
        ),
    );
  }, [items, searchTerm]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(
    () => filteredItems.slice((page - 1) * pageSize, page * pageSize),
    [filteredItems, page, pageSize],
  );

  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  const getControlHref = (controlId: string) =>
    `/${orgId}/frameworks/${frameworkInstanceId}/controls/${controlId}`;

  const handleRowClick = (controlId: string) => {
    router.push(getControlHref(controlId));
  };

  return (
    <div className="space-y-4">
      <div className="w-full max-w-sm">
        <InputGroup>
          <InputGroupAddon>
            <Search size={16} />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search controls..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </div>
      <Table
        variant="bordered"
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
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Requirement</TableHead>
            <TableHead>Compliance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Policies</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead>Documents</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <Text size="sm" variant="muted">
                  No controls found.
                </Text>
              </TableCell>
            </TableRow>
          ) : (
            paginatedItems.map(({ control, requirements }) => {
              const policies = control.policies ?? [];
              const documentTypes = control.controlDocumentTypes ?? [];
              const counts = getRequirementArtifactCounts([control], tasks, evidenceSubmissions);
              const status = getControlStatus(
                policies,
                tasks,
                control.id,
                documentTypes,
                evidenceSubmissions,
              );
              const badge = getStatusBadge(status);
              const compliancePercent = getControlProgressPercent(
                policies,
                tasks,
                control.id,
                documentTypes,
                evidenceSubmissions,
              );

              return (
                <TableRow
                  key={control.id}
                  onClick={() => handleRowClick(control.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Link
                      href={getControlHref(control.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="group flex items-center gap-2"
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
                    <RequirementCell requirements={requirements} />
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
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function RequirementCell({
  requirements,
}: {
  requirements: Array<{ id: string; name: string; identifier: string }>;
}) {
  if (requirements.length === 0) {
    return (
      <Text size="sm" variant="muted">
        —
      </Text>
    );
  }

  const label = requirements
    .map((r) => r.identifier || r.name)
    .join(', ');

  return (
    <span className="block max-w-[200px] truncate text-sm" title={label}>
      {label}
    </span>
  );
}
