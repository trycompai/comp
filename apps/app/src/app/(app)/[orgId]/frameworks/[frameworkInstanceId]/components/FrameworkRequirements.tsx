'use client';

import type { Control, FrameworkEditorRequirement, Task } from '@db';
import {
  Badge,
  Heading,
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
import { Search } from '@trycompai/design-system/icons';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';
import { getControlStatus } from '@/lib/control-compliance';

interface RequirementItem extends FrameworkEditorRequirement {
  mappedControlsCount: number;
  satisfiedControlsCount: number;
  compliancePercent: number;
}

function getRequirementStatus(
  satisfiedCount: number,
  totalCount: number,
): { label: string; variant: 'default' | 'secondary' | 'destructive' } {
  if (totalCount === 0) return { label: 'No Controls', variant: 'secondary' };
  if (satisfiedCount === totalCount) return { label: 'Satisfied', variant: 'default' };
  if (satisfiedCount > 0) return { label: 'In Progress', variant: 'secondary' };
  return { label: 'Not Started', variant: 'destructive' };
}

interface EvidenceSubmissionInfo {
  id: string;
  formType: string;
  createdAt: Date | string;
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

  const items = useMemo(() => {
    return requirementDefinitions.map((def) => {
      const mappedControls = frameworkInstanceWithControls.controls.filter(
        (control) =>
          control.requirementsMapped?.some((reqMap) => reqMap.requirementId === def.id) ?? false,
      );

      const satisfiedControlsCount = mappedControls.filter(
        (control) => getControlStatus(
          control.policies,
          tasks ?? [],
          control.id,
          control.controlDocumentTypes,
          evidenceSubmissions,
        ) === 'completed',
      ).length;

      const compliancePercent =
        mappedControls.length > 0
          ? Math.round((satisfiedControlsCount / mappedControls.length) * 100)
          : 0;

      return {
        ...def,
        mappedControlsCount: mappedControls.length,
        satisfiedControlsCount,
        compliancePercent,
      };
    });
  }, [requirementDefinitions, frameworkInstanceWithControls.controls, tasks, evidenceSubmissions]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const lowerSearch = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.description?.toLowerCase().includes(lowerSearch),
    );
  }, [items, searchTerm]);

  const handleRowClick = (requirementId: string) => {
    router.push(`/${orgId}/frameworks/${frameworkInstanceId}/requirements/${requirementId}`);
  };

  if (!items?.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Heading level="2">
        Requirements ({filteredItems.length})
      </Heading>
      <div className="w-full max-w-sm">
        <InputGroup>
          <InputGroupAddon>
            <Search size={16} />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search requirements..."
            value={searchTerm}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
          />
        </InputGroup>
      </div>
      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Controls</TableHead>
            <TableHead>Compliance</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <Text size="sm" variant="muted">
                  No requirements found.
                </Text>
              </TableCell>
            </TableRow>
          ) : (
            filteredItems.map((item) => {
              const status = getRequirementStatus(item.satisfiedControlsCount, item.mappedControlsCount);

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
                    <span className="line-clamp-2 max-w-[300px]">{item.name}</span>
                  </TableCell>
                  <TableCell>
                    <div className="line-clamp-2 max-w-[300px]">
                      <Text size="sm" variant="muted">
                        {item.description}
                      </Text>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="tabular-nums">
                      <Text size="sm" variant="muted">
                        {item.satisfiedControlsCount}/{item.mappedControlsCount}
                      </Text>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flex-1 rounded-full bg-muted/50 h-1.5">
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
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
