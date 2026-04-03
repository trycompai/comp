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
import { useMemo, useState } from 'react';
import { getControlStatus } from '@/lib/control-compliance';

type ControlWithPolicies = Control & {
  policies?: Array<{ id: string; name: string; status: string }>;
  controlDocumentTypes?: Array<{ formType: string }>;
};

interface EvidenceSubmissionInfo {
  id: string;
  formType: string;
  createdAt: Date | string;
}

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

  const filteredControls = useMemo(() => {
    if (!controls?.length) return [];
    if (!searchTerm.trim()) return controls;

    const searchLower = searchTerm.toLowerCase();
    return controls.filter((control) => control.name.toLowerCase().includes(searchLower));
  }, [controls, searchTerm]);

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

      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Control</TableHead>
            <TableHead>Policies</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredControls.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
                <Text size="sm" variant="muted">
                  No controls found.
                </Text>
              </TableCell>
            </TableRow>
          ) : (
            filteredControls.map((control) => {
              const controlTasks = tasks.filter((t) => t.controls.some((c) => c.id === control.id));
              const policies = control.policies ?? [];
              const publishedCount = policies.filter((p) => p.status === 'published').length;
              const doneTasks = controlTasks.filter(
                (t) => t.status === 'done' || t.status === 'not_relevant',
              ).length;

              const status = getControlStatus(
                policies,
                tasks,
                control.id,
                control.controlDocumentTypes,
                evidenceSubmissions,
              );
              const badge = getStatusBadge(status);

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
                      <Text size="sm" weight="medium">
                        {control.name}
                      </Text>
                      <Launch
                        size={14}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="tabular-nums">
                      <Text size="sm" variant="muted">
                        {publishedCount}/{policies.length}
                      </Text>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="tabular-nums">
                      <Text size="sm" variant="muted">
                        {doneTasks}/{controlTasks.length}
                      </Text>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
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
