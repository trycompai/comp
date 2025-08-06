'use client';

import { updateTaskAction } from '@/actions/risk/task/update-task-action';
import { getUpdateTaskSchema } from '@/actions/schema';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Textarea } from '@comp/ui/textarea';
import type { Task } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { T, useGT } from 'gt-next';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

export function UpdateTaskOverviewForm({ task }: { task: Task }) {
  const t = useGT();
  const updateTaskSchema = React.useMemo(() => getUpdateTaskSchema(t), [t]);
  const [open, setOpen] = useQueryState('task-update-overview-sheet');

  const updateTask = useAction(updateTaskAction, {
    onSuccess: () => {
      toast.success(t('Risk updated successfully'));
      setOpen(null);
    },
    onError: () => {
      toast.error(t('Failed to update risk'));
    },
  });

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

  const onSubmit = (values: z.infer<ReturnType<typeof getUpdateTaskSchema>>) => {
    updateTask.execute({
      id: values.id,
      title: values.title,
      description: values.description,
      status: values.status,
      assigneeId: values.assigneeId,
    });
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
                <T>
                  <FormLabel>Task Title</FormLabel>
                </T>
                <FormControl>
                  <Input
                    {...field}
                    autoFocus
                    className="mt-3"
                    placeholder={t('A short, descriptive title for the task.')}
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
                <T>
                  <FormLabel>Description</FormLabel>
                </T>
                <FormControl>
                  <Textarea
                    {...field}
                    className="mt-3 min-h-[80px]"
                    placeholder={t('Provide a detailed description of what needs to be done.')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="mt-8 flex justify-end">
          <Button type="submit" variant="default" disabled={updateTask.status === 'executing'}>
            {updateTask.status === 'executing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t('Save')
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
