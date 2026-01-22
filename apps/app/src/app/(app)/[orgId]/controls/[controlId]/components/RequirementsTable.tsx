'use client';

import type {
  FrameworkEditorFramework,
  FrameworkEditorRequirement,
  FrameworkInstance,
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
    requirement: FrameworkEditorRequirement;
  })[];
  orgId: string;
}

export function RequirementsTable({ requirements, orgId }: RequirementsTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter requirements data based on search term
  const filteredRequirements = useMemo(() => {
    if (!searchTerm.trim()) return requirements;

    const searchLower = searchTerm.toLowerCase();
    return requirements.filter((req) => {
      // Search in ID, name, and description from the nested requirement object
      return (
        (req.requirement.id?.toLowerCase() || '').includes(searchLower) ||
        (req.requirement.name?.toLowerCase() || '').includes(searchLower) ||
        (req.requirement.description?.toLowerCase() || '').includes(searchLower) ||
        (req.requirement.identifier?.toLowerCase() || '').includes(searchLower) // Also search identifier
      );
    });
  }, [requirements, searchTerm]);

  const handleRowClick = (requirement: RequirementMap) => {
    router.push(
      `/${orgId}/frameworks/${requirement.frameworkInstanceId}/requirements/${requirement.requirementId}`,
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
            filteredRequirements.map((requirement) => (
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
                    {requirement.requirement.name}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="line-clamp-2 h-10 max-w-[600px] truncate text-wrap">
                    {requirement.requirement.description}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
