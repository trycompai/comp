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
import { Button } from '@trycompai/ui/button';
import { PlusIcon, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import type {
  FrameworkInstanceWithControls,
  InstanceRequirementWithMaps,
} from '../../types';
import { useFrameworkInstance } from '../hooks/useFrameworkInstance';
import { CreateRequirementSheet } from './CreateRequirementSheet';

interface RequirementItem {
  id: string;
  name: string;
  description: string;
  mappedControlsCount: number;
  isCustom: boolean;
}

export function FrameworkRequirements({
  requirementDefinitions,
  frameworkInstanceWithControls,
  instanceRequirements: initialInstanceRequirements,
  frameworkInstanceId,
}: {
  requirementDefinitions: FrameworkEditorRequirement[];
  frameworkInstanceWithControls: FrameworkInstanceWithControls;
  instanceRequirements?: InstanceRequirementWithMaps[];
  frameworkInstanceId: string;
}) {
  const router = useRouter();
  const { orgId } = useParams<{ orgId: string }>();
  const { hasPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { data, mutate } = useFrameworkInstance(frameworkInstanceId);

  const instanceReqs = data?.frameworkInstanceRequirements ?? initialInstanceRequirements ?? [];

  const items = useMemo(() => {
    const templateItems: RequirementItem[] = requirementDefinitions.map((def) => {
      const mappedControlsCount = frameworkInstanceWithControls.controls.filter(
        (control) =>
          control.requirementsMapped?.some((reqMap) => reqMap.requirementId === def.id) ?? false,
      ).length;

      return {
        id: def.id,
        name: def.name,
        description: def.description,
        mappedControlsCount,
        isCustom: false,
      };
    });

    const customItems: RequirementItem[] = instanceReqs.map((req) => ({
      id: req.id,
      name: req.name,
      description: req.description,
      mappedControlsCount: req.requirementMaps?.length ?? 0,
      isCustom: true,
    }));

    return [...templateItems, ...customItems];
  }, [requirementDefinitions, frameworkInstanceWithControls.controls, instanceReqs]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const lowerSearch = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.description?.toLowerCase().includes(lowerSearch),
    );
  }, [items, searchTerm]);

  const handleRowClick = (item: RequirementItem) => {
    router.push(`/${orgId}/frameworks/${frameworkInstanceId}/requirements/${item.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/v1/framework-instance-requirements/${id}`);
      toast.success('Requirement deleted');
      mutate();
    } catch {
      toast.error('Failed to delete requirement');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Heading level="2">Requirements ({filteredItems.length})</Heading>
        {hasPermission('framework', 'create') && (
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Requirement
          </Button>
        )}
      </div>
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
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
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
                onClick={() => handleRowClick(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleRowClick(item);
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
                <TableCell>
                  {item.isCustom && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={(e) => handleDelete(e, item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <CreateRequirementSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        frameworkInstanceId={frameworkInstanceId}
        onCreated={() => mutate()}
      />
    </div>
  );
}
