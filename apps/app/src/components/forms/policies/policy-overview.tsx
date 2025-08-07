'use client';

import { updatePolicyFormAction } from '@/actions/policies/update-policy-form-action';
import { updatePolicyFormSchema } from '@/actions/schema';
import { StatusIndicator } from '@/components/status-indicator';
import { useSession } from '@/utils/auth-client';
import { Button } from '@comp/ui/button';
import { Calendar } from '@comp/ui/calendar';
import { cn } from '@comp/ui/cn';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@comp/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Departments, Frequency, type Policy, type PolicyStatus } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

const policyStatuses: PolicyStatus[] = ['draft', 'published', 'needs_review'] as const;

export function UpdatePolicyOverview({ policy }: { policy: Policy }) {
  const session = useSession();

  const updatePolicyForm = useAction(updatePolicyFormAction, {
    onSuccess: () => {
      toast.success('Policy updated successfully');
    },
    onError: () => {
      toast.error('Failed to update policy');
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
    },
  });

  const onSubmit = (data: z.infer<typeof updatePolicyFormSchema>) => {
    updatePolicyForm.execute({
      id: data.id,
      status: data.status as PolicyStatus,
      assigneeId: data.assigneeId,
      department: data.department,
      review_frequency: data.review_frequency,
      review_date: data.review_date,
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
                <FormLabel>{'Status'}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={'Select a status'}>
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
                <FormLabel>{'Review Frequency'}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={'Select a frequency'} />
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
        <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="review_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{'Review Date'}</FormLabel>
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
                          {field.value ? format(field.value, 'PPP') : <span>{'Pick a date'}</span>}
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
              'Save'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
