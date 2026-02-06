'use client';

import { useApi } from '@/hooks/use-api';
import { updateTaskSchema } from '@/actions/schema';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Textarea } from '@comp/ui/textarea';
import type { Task } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

export function UpdateTaskOverviewForm({ task }: { task: Task }) {
  const [open, setOpen] = useQueryState('task-update-overview-sheet');
  const api = useApi();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof updateTaskSchema>>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      assigneeId: task.assigneeId,
    },
  });

  const onSubmit = async (values: z.infer<typeof updateTaskSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await api.patch(`/v1/tasks/${values.id}`, {
        title: values.title,
        description: values.description,
        status: values.status,
        assigneeId: values.assigneeId,
      });
      if (response.error) throw new Error(response.error);
      toast.success('Risk updated successfully');
      setOpen(null);
      router.refresh();
    } catch {
      toast.error('Failed to update risk');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{'Task Title'}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoFocus
                    className="mt-3"
                    placeholder={'A short, descriptive title for the task.'}
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
                    className="mt-3 min-h-[80px]"
                    placeholder={'Provide a detailed description of what needs to be done.'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="mt-8 flex justify-end">
          <Button type="submit" variant="default" disabled={isSubmitting}>
            {isSubmitting ? (
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
