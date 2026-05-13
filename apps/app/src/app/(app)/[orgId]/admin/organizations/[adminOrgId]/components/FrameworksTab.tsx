'use client';

import { api } from '@/lib/api-client';
import {
  Badge,
  Button,
  Section,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Add, TrashCan } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FrameworkConfirmationDialog } from './FrameworkConfirmationDialog';
import { ActiveFrameworkCards, AvailableFrameworkCards } from './FrameworkMobileCards';

export interface FrameworkDetails {
  id: string;
  name: string;
  description: string | null;
  version: string;
  visible: boolean;
}

export interface ActiveFramework {
  id: string;
  framework: FrameworkDetails | null;
  customFramework: FrameworkDetails | null;
}

interface AdminFrameworksResponse {
  frameworks: ActiveFramework[];
  availableFrameworks: FrameworkDetails[];
}

export type PendingAction =
  | { type: 'add'; framework: FrameworkDetails }
  | { type: 'delete'; framework: ActiveFramework };

function getActiveFrameworkDetails(framework: ActiveFramework) {
  return framework.framework ?? framework.customFramework;
}

export function getActiveFrameworkName(framework: ActiveFramework) {
  return getActiveFrameworkDetails(framework)?.name ?? 'Unknown framework';
}

export function FrameworksTab({ orgId }: { orgId: string }) {
  const [frameworks, setFrameworks] = useState<ActiveFramework[]>([]);
  const [availableFrameworks, setAvailableFrameworks] = useState<FrameworkDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const fetchFrameworks = useCallback(async () => {
    setLoading(true);
    const res = await api.get<AdminFrameworksResponse>(
      `/v1/admin/organizations/${orgId}/frameworks`,
    );
    if (res.error) {
      toast.error(res.error);
    }
    if (res.data) {
      setFrameworks(res.data.frameworks);
      setAvailableFrameworks(res.data.availableFrameworks);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    void fetchFrameworks();
  }, [fetchFrameworks]);

  const handleDialogOpenChange = (open: boolean) => {
    if (submitting) return;
    if (!open) {
      setPendingAction(null);
    }
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;

    setSubmitting(true);
    const response =
      pendingAction.type === 'add'
        ? await api.post(`/v1/admin/organizations/${orgId}/frameworks`, {
            frameworkIds: [pendingAction.framework.id],
          })
        : await api.delete(
            `/v1/admin/organizations/${orgId}/frameworks/${pendingAction.framework.id}`,
          );

    setSubmitting(false);

    if (response.error) {
      toast.error(response.error);
      return;
    }

    toast.success(
      pendingAction.type === 'add'
        ? 'Framework added to organization'
        : 'Framework removed from organization',
    );
    setPendingAction(null);
    await fetchFrameworks();
  };

  const sortedFrameworks = [...frameworks].sort((a, b) =>
    getActiveFrameworkName(a).localeCompare(getActiveFrameworkName(b)),
  );
  const sortedAvailableFrameworks = [...availableFrameworks].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading frameworks...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section title={`Active Frameworks (${frameworks.length})`}>
        {frameworks.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            No frameworks have been added to this organization.
          </div>
        ) : (
          <>
            <ActiveFrameworkCards
              frameworks={sortedFrameworks}
              onDelete={(framework) => {
                setPendingAction({ type: 'delete', framework });
              }}
            />
            <div className="hidden overflow-x-auto md:block">
              <Table variant="bordered">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFrameworks.map((framework) => (
                    <ActiveFrameworkRow
                      key={framework.id}
                      framework={framework}
                      onDelete={(selectedFramework) => {
                        setPendingAction({
                          type: 'delete',
                          framework: selectedFramework,
                        });
                      }}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Section>

      <Section title={`Available Frameworks (${availableFrameworks.length})`}>
        {availableFrameworks.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            No additional visible frameworks are available to add.
          </div>
        ) : (
          <>
            <AvailableFrameworkCards
              frameworks={sortedAvailableFrameworks}
              onAdd={(framework) => {
                setPendingAction({ type: 'add', framework });
              }}
            />
            <div className="hidden overflow-x-auto md:block">
              <Table variant="bordered">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAvailableFrameworks.map((framework) => (
                    <TableRow key={framework.id}>
                      <TableCell>
                        <Text size="sm" weight="medium">
                          {framework.name}
                        </Text>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{framework.version}</Badge>
                      </TableCell>
                      <TableCell>
                        <Text size="sm" variant="muted">
                          {framework.description ?? '--'}
                        </Text>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          iconLeft={<Add size={16} />}
                          onClick={() => {
                            setPendingAction({ type: 'add', framework });
                          }}
                        >
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Section>

      <FrameworkConfirmationDialog
        pendingAction={pendingAction}
        submitting={submitting}
        onOpenChange={handleDialogOpenChange}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

function ActiveFrameworkRow({
  framework,
  onDelete,
}: {
  framework: ActiveFramework;
  onDelete: (framework: ActiveFramework) => void;
}) {
  const details = getActiveFrameworkDetails(framework);

  return (
    <TableRow>
      <TableCell>
        <div className="max-w-[420px]">
          <div className="truncate">
            <Text size="sm" weight="medium">
              {details?.name ?? 'Unknown framework'}
            </Text>
          </div>
          {details?.description && (
            <div className="truncate">
              <Text size="xs" variant="muted">
                {details.description}
              </Text>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">v{details?.version ?? '--'}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={framework.customFramework ? 'secondary' : 'default'}>
          {framework.customFramework ? 'Custom' : 'Platform'}
        </Badge>
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="destructive"
          iconLeft={<TrashCan size={16} />}
          onClick={() => onDelete(framework)}
        >
          Remove
        </Button>
      </TableCell>
    </TableRow>
  );
}
