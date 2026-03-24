'use client';

import { Button } from '@trycompai/ui/button';
import { Badge } from '@trycompai/ui/badge';
import { Heading, Text } from '@trycompai/design-system';
import { ChevronDown, ChevronRight, Pencil, PlusIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { useFrameworkInstance } from '../hooks/useFrameworkInstance';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import type {
  InstanceRequirementWithMaps,
  RequirementMapWithControl,
  TemplateRequirement,
} from '../../types';
import { CreateRequirementSheet } from './CreateRequirementSheet';

interface FrameworkRequirementsListProps {
  frameworkInstanceId: string;
  templateRequirements: TemplateRequirement[];
  instanceRequirements: InstanceRequirementWithMaps[];
  requirementMaps: RequirementMapWithControl[];
  organizationId: string;
}

export function FrameworkRequirementsList({
  frameworkInstanceId,
  templateRequirements: initialTemplateRequirements,
  instanceRequirements: initialInstanceRequirements,
  requirementMaps: initialRequirementMaps,
  organizationId,
}: FrameworkRequirementsListProps) {
  const { hasPermission } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);
  const { data, mutate } = useFrameworkInstance(frameworkInstanceId);

  const instanceRequirements = data?.frameworkInstanceRequirements ?? initialInstanceRequirements;
  const requirementMaps = data?.requirementMaps ?? initialRequirementMaps;

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/v1/framework-instance-requirements/${id}`);
      toast.success('Requirement deleted');
      mutate();
    } catch {
      toast.error('Failed to delete requirement');
    }
  };

  if (instanceRequirements.length === 0 && !hasPermission('framework', 'create')) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Heading level="2">Custom Requirements ({instanceRequirements.length})</Heading>
        {hasPermission('framework', 'create') && (
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Requirement
          </Button>
        )}
      </div>

      {instanceRequirements.length === 0 ? (
        <Text size="sm" variant="muted">
          No custom requirements yet. Add one to extend this framework.
        </Text>
      ) : (
        <div className="space-y-2">
          {instanceRequirements.map((req) => (
            <RequirementRow
              key={req.id}
              id={req.id}
              name={req.name}
              identifier={req.identifier}
              description={req.description}
              requirementMaps={req.requirementMaps ?? []}
              onDelete={handleDelete}
              organizationId={organizationId}
            />
          ))}
        </div>
      )}

      <CreateRequirementSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        frameworkInstanceId={frameworkInstanceId}
        onCreated={() => mutate()}
      />
    </div>
  );
}

function RequirementRow({
  id,
  name,
  identifier,
  description,
  requirementMaps,
  onDelete,
  organizationId,
}: {
  id: string;
  name: string;
  identifier: string;
  description: string;
  requirementMaps: RequirementMapWithControl[];
  onDelete: (id: string) => void;
  organizationId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const controls = requirementMaps.map((rm) => rm.control);

  return (
    <div className="border rounded-lg">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              {identifier && (
                <span className="text-xs font-mono text-muted-foreground">{identifier}</span>
              )}
              <span className="text-sm font-medium">{name}</span>
              <Badge variant="default" className="text-xs">
                Custom
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground truncate">{description}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {controls.length} {controls.length === 1 ? 'control' : 'controls'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-2">
          {controls.length === 0 ? (
            <Text size="sm" variant="muted">
              No controls linked to this requirement.
            </Text>
          ) : (
            controls.map((control) => (
              <div
                key={control.id}
                className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{control.name}</span>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{control.tasks?.length ?? 0} tasks</span>
                    <span>{control.policies?.length ?? 0} policies</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
