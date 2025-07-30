'use client';

import { SelectAssignee } from '@/components/SelectAssignee';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Textarea } from '@comp/ui/textarea';
import type { Member, Task, User } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightIcon } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useParams } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { updateVendorTaskSchema } from '../../../../actions/schema';
import { updateVendorTaskAction } from '../../../../actions/task/update-task-action';

interface UpdateTaskSheetProps {
  task: Task & { assignee: { user: User } | null };
  assignees: (Member & { user: User })[];
}

export function UpdateTaskSheet({ task, assignees }: UpdateTaskSheetProps) {
  const [_, setTaskOverviewSheet] = useQueryState('task-overview-sheet');
  const params = useParams<{ taskId: string }>();

  const updateTask = useAction(updateVendorTaskAction, {
    onSuccess: () => {
      toast.success('Task updated successfully');
      setTaskOverviewSheet(null);
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  const form = useForm<z.infer<typeof updateVendorTaskSchema>>({
    resolver: zodResolver(updateVendorTaskSchema),
    defaultValues: {
      id: params.taskId,
      title: task.title,
      description: task.description,
      status: task.status,
      assigneeId: task.assigneeId || null,
    },
  });

  const onSubmit = (data: z.infer<typeof updateVendorTaskSchema>) => {
    updateTask.execute(data);
  };

  // Function to render status with correct color
  const renderStatus = (status: string) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'open':
          return '#ffc107'; // yellow/amber
        case 'in_progress':
          return '#0ea5e9'; // blue
        case 'completed':
          return '#00DC73'; // green
        case 'cancelled':
          return '#64748b'; // gray
        default:
          return '#64748b';
      }
    };

    return (
      <div className="flex items-center gap-2">
        <div className="size-2.5" style={{ backgroundColor: getStatusColor(status) }} />
        <span>{status.replace('_', ' ')}</span>
      </div>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="scrollbar-hide h-[calc(100vh-250px)] overflow-auto">
          <div>
            <Accordion type="multiple" defaultValue={['task']}>
              <AccordionItem value="task">
                <AccordionTrigger>Task Details</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              autoFocus
                              className="mt-3"
                              placeholder="Enter title"
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
                            <Textarea {...field} className="mt-3" placeholder="Enter description" />
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
                          <FormLabel>Status</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                form.handleSubmit(onSubmit)();
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select status">
                                  {field.value && renderStatus(field.value)}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">{renderStatus('open')}</SelectItem>
                                <SelectItem value="in_progress">
                                  {renderStatus('in_progress')}
                                </SelectItem>
                                <SelectItem value="completed">
                                  {renderStatus('completed')}
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  {renderStatus('cancelled')}
                                </SelectItem>
                              </SelectContent>
                            </Select>
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
                          <FormLabel>Assignee</FormLabel>
                          <FormControl>
                            <SelectAssignee
                              assigneeId={field.value}
                              assignees={assignees}
                              onAssigneeChange={field.onChange}
                              disabled={updateTask.status === 'executing'}
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
            <Button type="submit" variant="default" disabled={updateTask.status === 'executing'}>
              <div className="flex items-center justify-center">
                Update
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </div>
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
