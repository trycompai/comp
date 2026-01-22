'use client';

import type { FrameworkEditorRequirement } from '@db';
import {
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
import type { FrameworkInstanceWithControls } from '../../types';

interface RequirementItem extends FrameworkEditorRequirement {
  mappedControlsCount: number;
}

export function FrameworkRequirements({
  requirementDefinitions,
  frameworkInstanceWithControls,
}: {
  requirementDefinitions: FrameworkEditorRequirement[];
  frameworkInstanceWithControls: FrameworkInstanceWithControls;
}) {
  const router = useRouter();
  const { orgId, frameworkInstanceId } = useParams<{
    orgId: string;
    frameworkInstanceId: string;
  }>();
  const [searchTerm, setSearchTerm] = useState('');

  const items = useMemo(() => {
    return requirementDefinitions.map((def) => {
      const mappedControlsCount = frameworkInstanceWithControls.controls.filter(
        (control) =>
          control.requirementsMapped?.some((reqMap) => reqMap.requirementId === def.id) ?? false,
      ).length;

      return {
        ...def,
        mappedControlsCount,
      };
    });
  }, [requirementDefinitions, frameworkInstanceWithControls.controls]);

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
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </InputGroup>
      </div>
      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Controls</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3}>
                <Text size="sm" variant="muted">
                  No requirements found.
                </Text>
              </TableCell>
            </TableRow>
          ) : (
            filteredItems.map((item) => (
              <TableRow
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => handleRowClick(item.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleRowClick(item.id);
                  }
                }}
              >
                <TableCell>
                  <span className="line-clamp-2 max-w-[300px] truncate">{item.name}</span>
                </TableCell>
                <TableCell>
                  <span className="line-clamp-2 max-w-[300px] truncate">{item.description}</span>
                </TableCell>
                <TableCell>
                  <Text size="sm" variant="muted">
                    {item.mappedControlsCount}
                  </Text>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
