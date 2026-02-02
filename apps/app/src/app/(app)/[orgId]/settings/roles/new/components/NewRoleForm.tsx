'use client';

import { api } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { RoleForm, type RoleFormValues } from '../../components/RoleForm';

interface NewRoleFormProps {
  orgId: string;
}

export function NewRoleForm({ orgId }: NewRoleFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: RoleFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/v1/roles', values, orgId);

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success('Role created successfully');
      router.push(`/${orgId}/settings/roles`);
      router.refresh();
    } catch (error) {
      toast.error('Failed to create role');
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
          Define a new role with specific permissions for your organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RoleForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          submitLabel="Create Role"
        />
      </CardContent>
    </Card>
  );
}
