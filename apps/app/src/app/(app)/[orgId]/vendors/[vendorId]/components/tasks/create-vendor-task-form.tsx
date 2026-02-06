'use client';

import { useApi } from '@/hooks/use-api';
import { SelectAssignee } from '@/components/SelectAssignee';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Calendar } from '@comp/ui/calendar';
import { cn } from '@comp/ui/cn';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@comp/ui/popover';
import { Textarea } from '@comp/ui/textarea';
import { Member, User } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ArrowRightIcon, CalendarIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const createVendorTaskFormSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  dueDate: z.date().optional(),
  assigneeId: z.string().optional(),
});

export function CreateVendorTaskForm({ assignees }: { assignees: (Member & { user: User })[] }) {
  const [_, setCreateVendorTaskSheet] = useQueryState('create-vendor-task-sheet');
  const params = useParams<{ vendorId: string }>();
  const api = useApi();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof createVendorTaskFormSchema>>({
    resolver: zodResolver(createVendorTaskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: new Date(),
      assigneeId: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof createVendorTaskFormSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/v1/tasks', {
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId || null,
        vendorId: params.vendorId,
      });
      if (response.error) throw new Error(response.error);
      toast.success('Task created successfully');
      setCreateVendorTaskSheet(null);
      router.refresh();
    } catch {
      toast.error('Failed to create task');
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
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>{'Due Date'}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'w-[240px] pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground',
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP')
                                  ) : (
                                    <span>{'Pick a date'}</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
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
                      name="assigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{'Assignee'}</FormLabel>
                          <FormControl>
                            <SelectAssignee
                              assignees={assignees}
                              assigneeId={field.value ?? null}
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
