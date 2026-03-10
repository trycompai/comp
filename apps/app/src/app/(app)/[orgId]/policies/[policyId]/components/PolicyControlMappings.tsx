'use client';

import { apiClient } from '@/lib/api-client';
import { SelectPills } from '@comp/ui/select-pills';
import type { Control } from '@db';
import { Section } from '@trycompai/design-system';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { usePolicy } from '../hooks/usePolicy';
import { usePermissions } from '@/hooks/use-permissions';
import useSWR from 'swr';

interface ControlsResponse {
  mappedControls: Pick<Control, 'id' | 'name' | 'description'>[];
  allControls: Pick<Control, 'id' | 'name' | 'description'>[];
}

export const PolicyControlMappings = ({
  mappedControls: initialMapped,
  allControls: initialAll,
  isPendingApproval,
  onMutate,
}: {
  mappedControls: Control[];
  allControls: Control[];
  isPendingApproval: boolean;
  onMutate?: () => void;
}) => {
  const { orgId, policyId } = useParams<{ orgId: string; policyId: string }>();
  const [loading, setLoading] = useState(false);
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('policy', 'update');

  const { data, mutate: mutateControls } = useSWR(
    [`/v1/policies/${policyId}/controls`, orgId],
    async () => {
      const res = await apiClient.get<ControlsResponse>(
        `/v1/policies/${policyId}/controls`,
      );
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    {
      fallbackData: { mappedControls: initialMapped, allControls: initialAll },
      revalidateOnMount: false,
      revalidateOnFocus: false,
    },
  );

  const mappedControls = data?.mappedControls ?? initialMapped;
  const allControls = data?.allControls ?? initialAll;

  const { addControlMappings, removeControlMapping } = usePolicy({
    policyId,
    organizationId: orgId,
  });

  const mappedNames = mappedControls.map((c) => c.name);

  const handleValueChange = async (selectedNames: string[]) => {
    if (isPendingApproval || loading || !canUpdate) return;
    setLoading(true);
    const prevIds = mappedControls.map((c) => c.id);
    const nextControls = allControls.filter((c) => selectedNames.includes(c.name));
    const nextIds = nextControls.map((c) => c.id);

    const added = nextControls.filter((c) => !prevIds.includes(c.id));
    const removed = mappedControls.filter((c) => !nextIds.includes(c.id));

    try {
      if (added.length > 0) {
        await addControlMappings(added.map((c) => c.id));
        toast.success('Controls mapped successfully');
      }
      if (removed.length > 0) {
        await removeControlMapping(removed[0].id);
        toast.success('Controls unmapped successfully');
      }
      await mutateControls();
      onMutate?.();
    } catch {
      toast.error('Failed to update controls');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section title="Map Controls" description="Map controls that are relevant to this policy.">
      <SelectPills
        data={allControls.map((c) => ({ id: c.id, name: c.name }))}
        value={mappedNames}
        onValueChange={handleValueChange}
        placeholder="Search controls..."
        disabled={isPendingApproval || loading || !canUpdate}
      />
    </Section>
  );
};
