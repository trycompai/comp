'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@trycompai/ui/card';
import { Stack, Text } from '@trycompai/design-system';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { PermissionMatrix } from '../../components/PermissionMatrix';

interface SystemRoleDetailProps {
  roleName: string;
  permissions: Record<string, string[]>;
  obligations: Record<string, boolean>;
  description: string;
  /** When false, the obligation toggle stays locked along with the rest of the matrix. */
  obligationsEditable?: boolean;
}

export function SystemRoleDetail({ roleName, permissions, obligations, description, obligationsEditable = false }: SystemRoleDetailProps) {
  const [currentObligations, setCurrentObligations] =
    useState<Record<string, boolean>>(obligations);
  const [isSaving, setIsSaving] = useState(false);

  // Resync if the user navigates between built-in role pages without a full
  // reload — `useState`'s initial value is only honored on mount.
  useEffect(() => {
    setCurrentObligations(obligations);
    // Keyed on roleName so a re-fetched obligations for the same role
    // (e.g., after the user toggles it) doesn't clobber the optimistic value.
  }, [roleName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleObligationsChange = async (next: Record<string, boolean>) => {
    if (isSaving || !obligationsEditable) return;
    const previous = currentObligations;
    setCurrentObligations(next);
    setIsSaving(true);
    try {
      const res = await apiClient.patch(
        `/v1/roles/built-in/${encodeURIComponent(roleName)}/obligations`,
        { obligations: next },
      );
      if (res.error) throw new Error(res.error);
    } catch (err) {
      setCurrentObligations(previous);
      toast.error(err instanceof Error ? err.message : 'Failed to update obligation');
      return;
    } finally {
      setIsSaving(false);
    }
    toast.success('Obligation updated');
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Stack gap="md">
          <Text size="sm" variant="muted">
            {description}
          </Text>
          <PermissionMatrix
            value={permissions}
            onChange={() => {}}
            obligations={currentObligations}
            onObligationsChange={handleObligationsChange}
            disabled
            obligationsEditable={obligationsEditable}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
