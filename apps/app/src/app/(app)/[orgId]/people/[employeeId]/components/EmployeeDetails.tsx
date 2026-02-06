'use client';

import { useApi } from '@/hooks/use-api';
import { Button } from '@comp/ui/button';
import { Form } from '@comp/ui/form';
import type { Departments, Member, User } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Section, Stack } from '@trycompai/design-system';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Department } from './Fields/Department';
import { Email } from './Fields/Email';
import { JoinDate } from './Fields/JoinDate';
import { Name } from './Fields/Name';
import { Status } from './Fields/Status';

// Define form schema with Zod
const employeeFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  department: z.enum(['admin', 'gov', 'hr', 'it', 'itsm', 'qms', 'none'] as const),
  status: z.enum(['active', 'inactive'] as const),
  createdAt: z.date(),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export const EmployeeDetails = ({
  employee,
  canEdit,
}: {
  employee: Member & {
    user: User;
  };
  canEdit: boolean;
}) => {
  const api = useApi();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: employee.user.name ?? '',
      email: employee.user.email ?? '',
      department: employee.department as Departments,
      status: employee.isActive ? 'active' : 'inactive',
      createdAt: new Date(employee.createdAt),
    },
    mode: 'onChange',
  });

  const onSubmit = async (values: EmployeeFormValues) => {
    // Prepare update data - only include changed fields
    const updateData: Record<string, unknown> = {};

    if (values.name !== employee.user.name) {
      updateData.name = values.name;
    }
    if (values.email !== employee.user.email) {
      updateData.email = values.email;
    }
    if (values.department !== employee.department) {
      updateData.department = values.department;
    }
    if (values.createdAt && values.createdAt.toISOString() !== employee.createdAt.toISOString()) {
      updateData.createdAt = values.createdAt.toISOString();
    }

    const isActive = values.status === 'active';
    if (isActive !== employee.isActive) {
      updateData.isActive = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.patch(`/v1/people/${employee.id}`, updateData);
      if (response.error) throw new Error(response.error);
      toast.success('Employee details updated successfully');
      router.refresh();
    } catch {
      toast.error('Failed to update employee details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Section>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Stack gap="lg">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Name control={form.control} disabled={!canEdit} />
              <Email control={form.control} disabled={true} />
              <Department control={form.control} disabled={!canEdit} />
              <Status control={form.control} disabled={!canEdit} />
              <JoinDate control={form.control} disabled={!canEdit} />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  !form.formState.isDirty ||
                  form.formState.isSubmitting ||
                  isSubmitting
                }
              >
                {!(form.formState.isSubmitting || isSubmitting) && (
                  <Save className="h-4 w-4" />
                )}
                {form.formState.isSubmitting || isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </Stack>
        </form>
      </Form>
    </Section>
  );
};
