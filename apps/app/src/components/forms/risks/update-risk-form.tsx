'use client';

import { updateRiskAction } from '@/actions/risk/update-risk-action';
import { updateRiskSchema } from '@/actions/schema';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Departments, type Risk } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Stack, Textarea } from '@trycompai/design-system';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

interface UpdateRiskFormProps {
  risk: Risk;
  onSuccess?: () => void;
}

export function UpdateRiskForm({ risk, onSuccess }: UpdateRiskFormProps) {
  const updateRisk = useAction(updateRiskAction, {
    onSuccess: () => {
      toast.success('Risk updated successfully');
      onSuccess?.();
    },
    onError: () => {
      toast.error('Failed to update risk');
    },
  });

  const form = useForm<z.infer<typeof updateRiskSchema>>({
    resolver: zodResolver(updateRiskSchema),
    defaultValues: {
      id: risk.id,
      title: risk.title,
      description: risk.description,
      category: risk.category,
      department: risk.department ?? Departments.admin,
      status: risk.status,
      assigneeId: risk.assigneeId,
    },
  });

  const onSubmit = (data: z.infer<typeof updateRiskSchema>) => {
    updateRisk.execute({
      id: data.id,
      title: data.title,
      description: data.description,
      category: data.category,
      department: data.department,
      status: data.status,
      assigneeId: data.assigneeId,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap="4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Risk Title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoFocus
                    placeholder="A short, descriptive title for the risk."
                    autoCorrect="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    placeholder="A detailed description of the risk, its potential impact, and its causes."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end pt-4">
            <button type="submit" disabled={updateRisk.status === 'executing'}>
              <Button loading={updateRisk.status === 'executing'}>Save</Button>
            </button>
          </div>
        </Stack>
      </form>
    </Form>
  );
}
