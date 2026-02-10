'use client';

import { SelectPills } from '@comp/ui/select-pills';
import type { Control } from '@db';
import { Section } from '@trycompai/design-system';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { usePolicy } from '../hooks/usePolicy';

export const PolicyControlMappings = ({
  mappedControls,
  allControls,
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

  const { addControlMappings, removeControlMapping } = usePolicy({
    policyId,
    organizationId: orgId,
  });

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
        await addControlMappings(added.map((c) => c.id));
        toast.success('Controls mapped successfully');
      }
      if (removed.length > 0) {
        await removeControlMapping(removed[0].id);
        toast.success('Controls unmapped successfully');
      }
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
        disabled={isPendingApproval || loading}
      />
    </Section>
  );
};
