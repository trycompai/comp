'use client';

import { updateRiskAction } from '@/actions/risk/update-risk-action';
import { updateRiskSchema } from '@/actions/schema';
import { SelectAssignee } from '@/components/SelectAssignee';
import { StatusIndicator } from '@/components/status-indicator';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Departments, Member, type Risk, RiskCategory, RiskStatus, type User } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';

import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

export function UpdateRiskOverview({
  risk,
  assignees,
}: {
  risk: Risk;
  assignees: (Member & { user: User })[];
}) {
  const updateRisk = useAction(updateRiskAction, {
    onSuccess: () => {
      toast.success('Risk updated successfully');
    },
    onError: () => {
      toast.error('Failed to update risk');
    },
  });

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

  const onSubmit = (data: z.infer<typeof updateRiskSchema>) => {
    updateRisk.execute({
      id: data.id,
      title: data.title,
      description: data.description,
      assigneeId: data.assigneeId,
      category: data.category,
      department: data.department,
      status: data.status,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{'Assignee'}</FormLabel>
                <FormControl>
                  <SelectAssignee
                    assigneeId={field.value ?? null}
                    assignees={assignees}
                    onAssigneeChange={field.onChange}
                    disabled={updateRisk.status === 'executing'}
                    withTitle={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{'Status'}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={'Select a status'}>
                        {field.value && <StatusIndicator status={field.value as RiskStatus} />}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(RiskStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          <StatusIndicator status={status} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{'Category'}</FormLabel>
                <FormControl>
                  <Select {...field} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={'Select a category'} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(RiskCategory).map((category) => {
                        const formattedCategory = category
                          .toLowerCase()
                          .split('_')
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ');
                        return (
                          <SelectItem key={category} value={category}>
                            {formattedCategory}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{'Department'}</FormLabel>
                <FormControl>
                  <Select {...field} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={'Select a department'} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Departments).map((department) => {
                        const formattedDepartment = department.toUpperCase();

                        return (
                          <SelectItem key={department} value={department}>
                            {formattedDepartment}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" variant="default" disabled={updateRisk.status === 'executing'}>
            {updateRisk.status === 'executing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
