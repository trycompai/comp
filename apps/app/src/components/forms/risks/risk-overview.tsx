'use client';

import { updateRiskSchema } from '@/actions/schema';
import { SelectAssignee } from '@/components/SelectAssignee';
import { StatusIndicator } from '@/components/status-indicator';
import { usePermissions } from '@/hooks/use-permissions';
import { useRiskActions } from '@/hooks/use-risks';
import { Departments, type Member, type Risk, RiskCategory, RiskStatus, type User } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Grid,
  HStack,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Stack,
} from '@trycompai/design-system';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import type { z } from 'zod';

export function UpdateRiskOverview({
  risk,
  assignees,
}: {
  risk: Risk;
  assignees: (Member & { user: User })[];
}) {
  const { updateRisk } = useRiskActions();
  const { mutate: globalMutate } = useSWRConfig();
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('risk', 'update');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof updateRiskSchema>>({
    resolver: zodResolver(updateRiskSchema),
    defaultValues: {
      id: risk.id,
      title: risk.title ?? '',
      description: risk.description ?? '',
      assigneeId: risk.assigneeId ?? null,
      category: risk.category ?? RiskCategory.operations,
      department: risk.department ?? Departments.admin,
      status: risk.status ?? RiskStatus.open,
    },
  });

  const onSubmit = async (data: z.infer<typeof updateRiskSchema>) => {
    setIsSubmitting(true);
    try {
      await updateRisk(data.id, {
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        category: data.category,
        department: data.department,
        status: data.status,
      });
      toast.success('Risk updated successfully');
      globalMutate(
        (key) => Array.isArray(key) && key[0]?.includes('/v1/risks'),
        undefined,
        { revalidate: true },
      );
    } catch {
      toast.error('Failed to update risk');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCategory = (category: string) =>
    category.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Stack gap="md">
        <Grid cols={{ base: '1', md: '2' }} gap="4">
          <Stack gap="sm">
            <Label>Assignee</Label>
            <SelectAssignee
              assigneeId={form.watch('assigneeId') ?? ''}
              assignees={assignees}
              onAssigneeChange={(id) => form.setValue('assigneeId', id, { shouldDirty: true })}
              disabled={!canUpdate || isSubmitting}
              withTitle={false}
            />
          </Stack>

          <Stack gap="sm">
            <Label>Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(value) => form.setValue('status', value as RiskStatus, { shouldDirty: true })}
              disabled={!canUpdate}
            >
              <SelectTrigger>
                {form.watch('status') && <StatusIndicator status={form.watch('status') as RiskStatus} />}
              </SelectTrigger>
              <SelectContent>
                {Object.values(RiskStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    <StatusIndicator status={status} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Stack>

          <Stack gap="sm">
            <Label>Category</Label>
            <Select
              value={form.watch('category')}
              onValueChange={(value) => form.setValue('category', value as RiskCategory, { shouldDirty: true })}
              disabled={!canUpdate}
            >
              <SelectTrigger>
                {formatCategory(form.watch('category') || '')}
              </SelectTrigger>
              <SelectContent>
                {Object.values(RiskCategory).map((category) => (
                  <SelectItem key={category} value={category}>
                    {formatCategory(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Stack>

          <Stack gap="sm">
            <Label>Department</Label>
            <Select
              value={form.watch('department')}
              onValueChange={(value) => form.setValue('department', value as Departments, { shouldDirty: true })}
              disabled={!canUpdate}
            >
              <SelectTrigger>
                {(form.watch('department') || '').toUpperCase()}
              </SelectTrigger>
              <SelectContent>
                {Object.values(Departments).map((department) => (
                  <SelectItem key={department} value={department}>
                    {department.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Stack>
        </Grid>

        {canUpdate && (
          <HStack justify="end">
            <Button type="submit" disabled={!form.formState.isDirty || isSubmitting} loading={isSubmitting}>
              Save
            </Button>
          </HStack>
        )}
      </Stack>
    </form>
  );
}
