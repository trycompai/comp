'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { RoleForm, type RoleFormValues } from '../../components/RoleForm';
import type { CustomRole } from '../../components/RolesTable';
import { useRoles } from '../../hooks/useRoles';

interface EditRolePageClientProps {
  orgId: string;
  roleId: string;
  initialData: CustomRole;
}

export function EditRolePageClient({ orgId, roleId, initialData }: EditRolePageClientProps) {
  const router = useRouter();
  const { updateRole } = useRoles();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: RoleFormValues) => {
    setIsSubmitting(true);
    try {
      await updateRole(roleId, values);
      toast.success('Role updated successfully');
      router.push(`/${orgId}/settings/roles`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/${orgId}/settings/roles`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Details</CardTitle>
        <CardDescription>
          Modify the permissions for this custom role.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RoleForm
          defaultValues={{
            name: initialData.name,
            permissions: initialData.permissions,
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          submitLabel="Update Role"
        />
      </CardContent>
    </Card>
  );
}
