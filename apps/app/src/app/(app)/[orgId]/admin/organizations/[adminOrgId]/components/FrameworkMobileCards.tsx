'use client';

import { Badge, Button, Text } from '@trycompai/design-system';
import { Add, TrashCan } from '@trycompai/design-system/icons';
import type { ActiveFramework, FrameworkDetails } from './FrameworksTab';

function getActiveDetails(framework: ActiveFramework) {
  return framework.framework ?? framework.customFramework;
}

export function ActiveFrameworkCards({
  frameworks,
  onDelete,
}: {
  frameworks: ActiveFramework[];
  onDelete: (framework: ActiveFramework) => void;
}) {
  return (
    <div className="grid gap-3 md:hidden">
      {frameworks.map((framework) => {
        const details = getActiveDetails(framework);

        return (
          <div key={framework.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <Text size="sm" weight="medium">
                  {details?.name ?? 'Unknown framework'}
                </Text>
                {details?.description && (
                  <Text size="xs" variant="muted">
                    {details.description}
                  </Text>
                )}
              </div>
              <Badge variant={framework.customFramework ? 'secondary' : 'default'}>
                {framework.customFramework ? 'Custom' : 'Platform'}
              </Badge>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Badge variant="outline">v{details?.version ?? '--'}</Badge>
              <Button
                size="sm"
                variant="destructive"
                iconLeft={<TrashCan size={16} />}
                onClick={() => onDelete(framework)}
              >
                Remove
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AvailableFrameworkCards({
  frameworks,
  onAdd,
}: {
  frameworks: FrameworkDetails[];
  onAdd: (framework: FrameworkDetails) => void;
}) {
  return (
    <div className="grid gap-3 md:hidden">
      {frameworks.map((framework) => (
        <div key={framework.id} className="rounded-lg border bg-card p-4">
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <Text size="sm" weight="medium">
                {framework.name}
              </Text>
              <Badge variant="outline">v{framework.version}</Badge>
            </div>
            <Text size="xs" variant="muted">
              {framework.description ?? 'No description provided.'}
            </Text>
          </div>
          <div className="mt-4 flex justify-end">
            <Button size="sm" iconLeft={<Add size={16} />} onClick={() => onAdd(framework)}>
              Add
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
