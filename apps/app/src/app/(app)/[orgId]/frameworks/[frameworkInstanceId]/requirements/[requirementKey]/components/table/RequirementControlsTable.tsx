'use client';

import type { Control, Task } from '@db';
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
import {
  type EvidenceSubmissionInfo,
  getControlProgressPercent,
  getControlStatus,
  getRequirementArtifactCounts,
} from '@/lib/control-compliance';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type ControlWithPolicies = Control & {
  policies?: Array<{ id: string; name: string; status: string }>;
  controlDocumentTypes?: Array<{ formType: string }>;
};

interface RequirementControlsTableProps {
  controls: ControlWithPolicies[];
  tasks: (Task & { controls: Control[] })[];
  evidenceSubmissions?: EvidenceSubmissionInfo[];
  frameworkInstanceId: string;
}

function getStatusBadge(status: string): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive';
} {
  switch (status) {
    case 'completed':
      return { label: 'Satisfied', variant: 'default' };
    case 'in_progress':
      return { label: 'In Progress', variant: 'secondary' };
    default:
      return { label: 'Not Started', variant: 'destructive' };
  }
}

export function RequirementControlsTable({
  controls,
  tasks,
  evidenceSubmissions = [],
  frameworkInstanceId,
}: RequirementControlsTableProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredControls = useMemo(() => {
    if (!controls?.length) return [];
    if (!searchTerm.trim()) return controls;

    const searchLower = searchTerm.toLowerCase();
    return controls.filter(
      (control) =>
        control.name.toLowerCase().includes(searchLower) ||
        control.description?.toLowerCase().includes(searchLower),
    );
  }, [controls, searchTerm]);

  const pageCount = Math.max(1, Math.ceil(filteredControls.length / pageSize));
  const paginatedControls = useMemo(
    () => filteredControls.slice((page - 1) * pageSize, page * pageSize),
    [filteredControls, page, pageSize],
  );

  // Snap back to page 1 when filtering or page-size changes shrink the result set.
  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  const getControlHref = (controlId: string) =>
    `/${orgId}/frameworks/${frameworkInstanceId}/controls/${controlId}`;

  const handleRowClick = (controlId: string) => {
    router.push(getControlHref(controlId));
  };

  if (!controls?.length) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Text variant="muted">No controls mapped to this requirement.</Text>
      </div>
    );
  }

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
            <TableHead>Description</TableHead>
            <TableHead>Compliance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Policies</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead>Documents</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedControls.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <Text size="sm" variant="muted">
                  No controls found.
                </Text>
              </TableCell>
            </TableRow>
          ) : (
            paginatedControls.map((control) => {
              const policies = control.policies ?? [];
              const documentTypes = control.controlDocumentTypes ?? [];

              // Use the shared aggregator so per-control counts (especially
              // documents) honour the same 6-month freshness rule as
              // getControlStatus / getControlProgressPercent below.
              const counts = getRequirementArtifactCounts(
                [control],
                tasks,
                evidenceSubmissions,
              );

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
                      <span
                        className="block max-w-[280px] truncate text-sm"
                        title={control.name}
                      >
                        {control.name}
                      </span>
                      <Launch
                        size={14}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span
                      className="block max-w-[240px] truncate text-sm"
                      title={control.description || ''}
                    >
                      {control.description || '—'}
                    </span>
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
