'use client';

import type {
  FrameworkEditorFramework,
  FrameworkEditorRequirement,
  FrameworkInstance,
  FrameworkInstanceRequirement,
  RequirementMap,
} from '@db';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@trycompai/design-system';
import { Search } from '@trycompai/design-system/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

interface RequirementsTableProps {
  requirements: (RequirementMap & {
    frameworkInstance: FrameworkInstance & {
      framework: FrameworkEditorFramework;
    };
    requirement: FrameworkEditorRequirement | null;
    frameworkInstanceRequirement?: FrameworkInstanceRequirement | null;
  })[];
  orgId: string;
}

function getRequirementData(req: RequirementsTableProps['requirements'][number]) {
  if (req.requirement) {
    return {
      id: req.requirement.id,
      name: req.requirement.name,
      description: req.requirement.description,
      identifier: req.requirement.identifier,
    };
  }
  if (req.frameworkInstanceRequirement) {
    return {
      id: req.frameworkInstanceRequirement.id,
      name: req.frameworkInstanceRequirement.name,
      description: req.frameworkInstanceRequirement.description,
      identifier: req.frameworkInstanceRequirement.identifier,
    };
  }
  return null;
}

export function RequirementsTable({ requirements, orgId }: RequirementsTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRequirements = useMemo(() => {
    if (!searchTerm.trim()) return requirements;

    const searchLower = searchTerm.toLowerCase();
    return requirements.filter((req) => {
      const data = getRequirementData(req);
      if (!data) return false;
      return (
        (data.id?.toLowerCase() || '').includes(searchLower) ||
        (data.name?.toLowerCase() || '').includes(searchLower) ||
        (data.description?.toLowerCase() || '').includes(searchLower) ||
        (data.identifier?.toLowerCase() || '').includes(searchLower)
      );
    });
  }, [requirements, searchTerm]);

  const handleRowClick = (req: RequirementsTableProps['requirements'][number]) => {
    const data = getRequirementData(req);
    if (!data) return;
    router.push(
      `/${orgId}/frameworks/${req.frameworkInstanceId}/requirements/${data.id}`,
    );
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
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </div>

      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRequirements.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2}>
                <Text size="sm" variant="muted">
                  No requirements found.
                </Text>
              </TableCell>
            </TableRow>
          ) : (
            filteredRequirements.map((requirement) => {
              const data = getRequirementData(requirement);
              if (!data) return null;
              return (
                <TableRow
                  key={requirement.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRowClick(requirement)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleRowClick(requirement);
                    }
                  }}
                >
                  <TableCell>
                    <span className="line-clamp-2 h-10 max-w-[600px] truncate text-wrap">
                      {data.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="line-clamp-2 h-10 max-w-[600px] truncate text-wrap">
                      {data.description}
                    </span>
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
