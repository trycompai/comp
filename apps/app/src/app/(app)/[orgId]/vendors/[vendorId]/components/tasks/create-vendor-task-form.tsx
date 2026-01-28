'use client';

import { SelectAssignee } from '@/components/SelectAssignee';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Textarea } from '@comp/ui/textarea';
import { Member, User } from '@db';
import { ArrowRightIcon, CalendarIcon } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useTaskItemActions } from '@/hooks/use-task-items';
import { useState } from 'react';

export function CreateVendorTaskForm({ assignees }: { assignees: (Member & { user: User })[] }) {
  const [_, setCreateVendorTaskSheet] = useQueryState('create-vendor-task-sheet');
  const params = useParams<{ vendorId: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createTaskItem } = useTaskItemActions();

  const form = useForm<{
    title: string;
    description: string;
    assigneeId: string;
  }>({
    defaultValues: {
      title: '',
      description: '',
      assigneeId: '',
    },
  });

  const onSubmit = async (data: { title: string; description: string; assigneeId: string }) => {
    if (!params.vendorId) {
      toast.error('Vendor ID is missing');
      return;
    }

    setIsSubmitting(true);
    try {
      await createTaskItem({
        title: data.title.trim(),
        description: data.description.trim() || undefined,
        entityId: params.vendorId,
        entityType: 'vendor',
        assigneeId: data.assigneeId || undefined,
      });
      toast.success('Task created successfully');
      setCreateVendorTaskSheet(null);
      form.reset({ title: '', description: '', assigneeId: '' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="scrollbar-hide h-[calc(100vh-250px)] overflow-auto">
          <div>
            <Accordion type="multiple" defaultValue={['task']}>
              <AccordionItem value="task">
                <AccordionTrigger>{'Task Details'}</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      rules={{ required: 'Task title is required' }}
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
                          <FormLabel>{'Description'}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="mt-3 min-h-[80px]"
                              placeholder={
                                'Provide a detailed description of what needs to be done.'
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{'Assignee'}</FormLabel>
                          <FormControl>
                            <SelectAssignee
                              assignees={assignees}
                              assigneeId={field.value}
                              onAssigneeChange={field.onChange}
                              withTitle={false}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="submit" variant="default" disabled={isSubmitting}>
              <div className="flex items-center justify-center">
                {'Create'}
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </div>
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
