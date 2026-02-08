'use client';

import { Form } from '@comp/ui/form';
import type { Departments, Member, User } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Grid } from '@trycompai/design-system';
import { useAction } from 'next-safe-action/hooks';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { updateEmployee } from '../actions/update-employee';
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

export const EMPLOYEE_FORM_ID = 'employee-details-form';

export const EmployeeDetails = ({
  employee,
  canEdit,
  onFormStateChange,
}: {
  employee: Member & {
    user: User;
  };
  canEdit: boolean;
  onFormStateChange?: (state: { isDirty: boolean; isLoading: boolean }) => void;
}) => {
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

  const { execute, status: actionStatus } = useAction(updateEmployee, {
    onSuccess: (res) => {
      if (!res?.data?.success) {
        toast.error(res?.data?.error?.message || 'Failed to update employee details');
        return;
      }
      toast.success('Employee details updated successfully');
    },
    onError: (error) => {
      toast.error(error?.error?.serverError || 'Failed to update employee details');
    },
  });

  const onSubmit = async (values: EmployeeFormValues) => {
    // Prepare update data
    const updateData: {
      employeeId: string;
      name?: string;
      email?: string;
      department?: string;
      isActive?: boolean;
      createdAt?: Date;
    } = { employeeId: employee.id };

    // Only include changed fields
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
      updateData.createdAt = values.createdAt;
    }

    const isActive = values.status === 'active';
    if (isActive !== employee.isActive) {
      updateData.isActive = isActive;
    }

    // Execute the update only if there are changes
    if (Object.keys(updateData).length > 1) {
      await execute(updateData);
    } else {
      // No changes were made
      toast.info('No changes to save');
    }
  };

  const isLoading = form.formState.isSubmitting || actionStatus === 'executing';
  const { isDirty } = form.formState;

  useEffect(() => {
    onFormStateChange?.({ isDirty, isLoading });
  }, [isDirty, isLoading, onFormStateChange]);

  return (
    <Form {...form}>
      <form id={EMPLOYEE_FORM_ID} onSubmit={form.handleSubmit(onSubmit)}>
        <Grid cols={{ base: '1', md: '2' }} gap="4">
          <Name control={form.control} disabled={!canEdit} />
          <Email control={form.control} disabled={true} />
          <Department control={form.control} disabled={!canEdit} />
          <Status control={form.control} disabled={!canEdit} />
          <JoinDate control={form.control} disabled={!canEdit} />
        </Grid>
      </form>
    </Form>
  );
};
