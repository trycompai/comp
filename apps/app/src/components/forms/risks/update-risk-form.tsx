'use client';

import { updateRiskSchema } from '@/actions/schema';
import { useRiskActions } from '@/hooks/use-risks';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Departments, type Risk } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Stack, Textarea } from '@trycompai/design-system';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import type { z } from 'zod';

interface UpdateRiskFormProps {
  risk: Risk;
  onSuccess?: () => void;
}

export function UpdateRiskForm({ risk, onSuccess }: UpdateRiskFormProps) {
  const { updateRisk } = useRiskActions();
  const { mutate: globalMutate } = useSWRConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const onSubmit = async (data: z.infer<typeof updateRiskSchema>) => {
    setIsSubmitting(true);
    try {
      await updateRisk(data.id, {
        title: data.title,
        description: data.description,
        category: data.category,
        department: data.department,
        status: data.status,
        assigneeId: data.assigneeId,
      });
      toast.success('Risk updated successfully');
      globalMutate(
        (key) => Array.isArray(key) && key[0]?.includes('/v1/risks'),
        undefined,
        { revalidate: true },
      );
      onSuccess?.();
    } catch {
      toast.error('Failed to update risk');
    } finally {
      setIsSubmitting(false);
    }
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
            <button type="submit" disabled={isSubmitting}>
              <Button loading={isSubmitting}>Save</Button>
            </button>
          </div>
        </Stack>
      </form>
    </Form>
  );
}
