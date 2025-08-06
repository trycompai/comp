'use client';

import { updatePolicyFormAction } from '@/actions/policies/update-policy-form-action';
import { getUpdatePolicyFormSchema } from '@/actions/schema';
import { StatusIndicator } from '@/components/status-indicator';
import { useSession } from '@/utils/auth-client';
import { Button } from '@comp/ui/button';
import { Calendar } from '@comp/ui/calendar';
import { cn } from '@comp/ui/cn';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@comp/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Switch } from '@comp/ui/switch';
import { Departments, Frequency, type Policy, type PolicyStatus } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { T, useGT } from 'gt-next';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

const policyStatuses: PolicyStatus[] = ['draft', 'published', 'needs_review'] as const;

export function UpdatePolicyOverview({ policy }: { policy: Policy }) {
  const session = useSession();
  const t = useGT();
  const updatePolicyFormSchema = React.useMemo(() => getUpdatePolicyFormSchema(t), [t]);

  const updatePolicyForm = useAction(updatePolicyFormAction, {
    onSuccess: () => {
      toast.success(t('Policy updated successfully'));
    },
    onError: () => {
      toast.error(t('Failed to update policy'));
    },
  });

  const calculateReviewDate = (): Date => {
    if (!policy.reviewDate) {
      return new Date();
    }
    return new Date(policy.reviewDate);
  };

  const reviewDate = calculateReviewDate();

  const form = useForm<z.infer<typeof updatePolicyFormSchema>>({
    resolver: zodResolver(updatePolicyFormSchema),
    defaultValues: {
      id: policy.id,
      status: policy.status,
      assigneeId: policy.assigneeId ?? session.data?.user?.id,
      department: policy.department ?? Departments.admin,
      review_frequency: policy.frequency ?? Frequency.monthly,
      review_date: reviewDate,
      isRequiredToSign: policy.isRequiredToSign ? 'required' : 'not_required',
    },
  });

  const onSubmit = (data: z.infer<ReturnType<typeof getUpdatePolicyFormSchema>>) => {
    updatePolicyForm.execute({
      id: data.id,
      status: data.status as PolicyStatus,
      assigneeId: data.assigneeId,
      department: data.department,
      review_frequency: data.review_frequency,
      review_date: data.review_date,
      isRequiredToSign: data.isRequiredToSign,
      entityId: data.id,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <T>
                  <FormLabel>Status</FormLabel>
                </T>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select a status')}>
                        {field.value && <StatusIndicator status={field.value} />}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {policyStatuses.map((status) => (
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
            name="review_frequency"
            render={({ field }) => (
              <FormItem>
                <T>
                  <FormLabel>Review Frequency</FormLabel>
                </T>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select a frequency')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Frequency).map((frequency) => {
                        const formattedFrequency =
                          frequency.charAt(0).toUpperCase() + frequency.slice(1);
                        return (
                          <SelectItem key={frequency} value={frequency}>
                            {formattedFrequency}
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
                <T>
                  <FormLabel>Department</FormLabel>
                </T>
                <FormControl>
                  <Select {...field} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select a department')} />
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
        <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="review_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <T>
                  <FormLabel>Review Date</FormLabel>
                </T>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <div className="pt-1.5">
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <T>
                              <span>Pick a date</span>
                            </T>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </div>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date <= new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isRequiredToSign"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-3">
                <T>
                  <FormLabel>Signature Requirement</FormLabel>
                </T>
                <FormControl>
                  <Switch
                    checked={field.value === 'required'}
                    onCheckedChange={(checked) => {
                      field.onChange(checked ? 'required' : 'not_required');
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            type="submit"
            variant="default"
            disabled={updatePolicyForm.status === 'executing'}
          >
            {updatePolicyForm.status === 'executing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <T>Save</T>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
