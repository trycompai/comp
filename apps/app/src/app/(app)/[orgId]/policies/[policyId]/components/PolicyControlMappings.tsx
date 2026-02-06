'use client';

import { useApi } from '@/hooks/use-api';
import { SelectPills } from '@comp/ui/select-pills';
import { Control } from '@db';
import { Section } from '@trycompai/design-system';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export const PolicyControlMappings = ({
  mappedControls,
  allControls,
  isPendingApproval,
}: {
  mappedControls: Control[];
  allControls: Control[];
  isPendingApproval: boolean;
}) => {
  const { policyId } = useParams<{ policyId: string }>();
  const api = useApi();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const mappedNames = mappedControls.map((c) => c.name);

  const handleValueChange = async (selectedNames: string[]) => {
    if (isPendingApproval || loading) return;
    setLoading(true);
    const prevIds = mappedControls.map((c) => c.id);
    const nextControls = allControls.filter((c) => selectedNames.includes(c.name));
    const nextIds = nextControls.map((c) => c.id);

    const added = nextControls.filter((c) => !prevIds.includes(c.id));
    const removed = mappedControls.filter((c) => !nextIds.includes(c.id));

    try {
      if (added.length > 0) {
        const response = await api.post(`/v1/policies/${policyId}/controls`, {
          controlIds: added.map((c) => c.id),
        });
        if (response.error) throw new Error(response.error);
        toast.success('Controls mapped successfully');
      }
      if (removed.length > 0) {
        const response = await api.delete(`/v1/policies/${policyId}/controls/${removed[0].id}`);
        if (response.error) throw new Error(response.error);
        toast.success('Controls unmapped successfully');
      }
      router.refresh();
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
        disabled={isPendingApproval || loading}
      />
    </Section>
  );
};
