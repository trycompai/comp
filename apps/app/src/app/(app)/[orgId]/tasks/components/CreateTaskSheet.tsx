'use client';

import { createTaskAction } from '@/actions/tasks/create-task-action';
import { SelectAssignee } from '@/components/SelectAssignee';
import { Button } from '@comp/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@comp/ui/drawer';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { useMediaQuery } from '@comp/ui/hooks';
import { Input } from '@comp/ui/input';
import MultipleSelector, { Option } from '@comp/ui/multiple-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@comp/ui/sheet';
import { Textarea } from '@comp/ui/textarea';
import { Departments, Member, TaskFrequency, User } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightIcon, X } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { taskDepartments, taskFrequencies } from '../[taskId]/components/constants';

const createTaskSchema = z.object({
  title: z.string().min(1, {
    message: 'Title is required',
  }),
  description: z.string().min(1, {
    message: 'Description is required',
  }),
  assigneeId: z.string().nullable().optional(),
  frequency: z.nativeEnum(TaskFrequency).nullable().optional(),
  department: z.nativeEnum(Departments).nullable().optional(),
  controlIds: z.array(z.string()).optional(),
});

export function CreateTaskSheet({
  members,
  controls,
  prefillTask,
  prefillControls,
}: {
  members: (Member & { user: User })[];
  controls: { id: string; name: string }[];
  prefillTask?: { title?: string; description?: string };
  prefillControls?: string[];
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [createTaskOpen, setCreateTaskOpen] = useQueryState('create-task');
  const isOpen = Boolean(createTaskOpen);

  const handleOpenChange = (open: boolean) => {
    setCreateTaskOpen(open ? 'true' : null);
  };

  const createTask = useAction(createTaskAction, {
    onSuccess: () => {
      toast.success('Task created successfully');
      setCreateTaskOpen(null);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.error?.serverError || 'Failed to create task');
    },
  });

  const form = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      assigneeId: null,
      frequency: null,
      department: null,
      controlIds: [],
    },
  });

  useEffect(() => {
    if (!isOpen || !prefillTask) {
      return;
    }

    if (prefillTask.title) {
      form.setValue('title', prefillTask.title, { shouldDirty: true });
    }

    if (prefillTask.description) {
      form.setValue('description', prefillTask.description, { shouldDirty: true });
    }
  }, [form, isOpen, prefillTask]);

  useEffect(() => {
    if (!isOpen || !prefillControls || prefillControls.length === 0) {
      return;
    }

    form.setValue('controlIds', prefillControls, { shouldDirty: true });
  }, [form, isOpen, prefillControls]);

  const onSubmit = useCallback(
    (data: z.infer<typeof createTaskSchema>) => {
      createTask.execute(data);
    },
    [createTask],
  );

  // Memoize control options to prevent re-renders
  const controlOptions = useMemo(
    () =>
      controls.map((control) => ({
        value: control.id,
        label: control.name,
      })),
    [controls],
  );

  // Memoize filter function to prevent re-renders
  const filterFunction = useCallback(
    (value: string, search: string) => {
      // Find the option with this value (control ID)
      const option = controlOptions.find((opt) => opt.value === value);
      if (!option) return 0;

      // Check if the control name (label) contains the search string
      return option.label.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
    },
    [controlOptions],
  );

  // Memoize select handlers
  const handleFrequencyChange = useCallback((value: string, onChange: (value: any) => void) => {
    onChange(value === 'none' ? null : value);
  }, []);

  const handleDepartmentChange = useCallback((value: string, onChange: (value: any) => void) => {
    onChange(value === 'none' ? null : value);
  }, []);

  const handleControlsChange = useCallback((options: Option[], onChange: (value: any) => void) => {
    onChange(options.map((option) => option.value));
  }, []);

  const taskForm = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full max-w-none">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Task Title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="A short, descriptive title for the task"
                  autoCorrect="off"
                  className="w-full"
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
            <FormItem className="w-full">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  className="min-h-[80px] w-full resize-none"
                  placeholder="Provide a detailed description of what needs to be done"
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
            <FormItem className="w-full">
              <FormLabel>Assignee (Optional)</FormLabel>
              <FormControl>
                <div className="w-full">
                  <SelectAssignee
                    assignees={members}
                    assigneeId={field.value ?? null}
                    onAssigneeChange={field.onChange}
                    withTitle={false}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Frequency (Optional)</FormLabel>
              <Select onValueChange={(value) => handleFrequencyChange(value, field.onChange)}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {taskFrequencies.map((frequency) => (
                    <SelectItem key={frequency} value={frequency}>
                      <span className="capitalize">{frequency.replace('_', ' ')}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Department (Optional)</FormLabel>
              <Select onValueChange={(value) => handleDepartmentChange(value, field.onChange)}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {taskDepartments
                    .filter((dept) => dept !== 'none')
                    .map((department) => (
                      <SelectItem key={department} value={department}>
                        <span className="capitalize">{department.toUpperCase()}</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="controlIds"
          render={({ field }) => {
            // Convert current field value to selected options (computed inline since it depends on field.value)
            const selectedOptions: Option[] = (field.value || [])
              .map((id) => {
                const control = controls.find((c) => c.id === id);
                return control ? { value: control.id, label: control.name } : null;
              })
              .filter(Boolean) as Option[];

            return (
              <FormItem className="w-full">
                <FormLabel>Controls (Optional)</FormLabel>
                <FormControl>
                  <div className="relative overflow-visible">
                    <MultipleSelector
                      value={selectedOptions}
                      onChange={(options) => handleControlsChange(options, field.onChange)}
                      defaultOptions={controlOptions}
                      placeholder="Search and select controls..."
                      emptyIndicator={
                        <p className="text-center text-lg leading-10 text-muted-foreground">
                          No controls found.
                        </p>
                      }
                      className="[&_[cmdk-list]]:!z-[9999] [&_[cmdk-list]]:!absolute [&_.relative]:!static"
                      commandProps={{
                        filter: filterFunction,
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={createTask.status === 'executing'}>
            <div className="flex items-center justify-center">
              Create Task
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </div>
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isDesktop) {
    return (
      <>
        <style>{`
          [data-radix-dialog-content] > div {
            overflow: visible !important;
          }
          [data-radix-scroll-area-viewport] {
            overflow: visible !important;
          }
        `}</style>
        <Sheet open={isOpen} onOpenChange={handleOpenChange}>
          <SheetContent stack className="flex flex-col overflow-visible [&>div]:!overflow-visible">
            <SheetHeader className="mb-8 flex flex-row items-center justify-between">
              <SheetTitle>Create New Task</SheetTitle>
              <Button
                size="icon"
                variant="ghost"
                className="m-0 size-auto p-0 hover:bg-transparent"
                onClick={() => setCreateTaskOpen(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </SheetHeader>

            <div className="flex-1 p-0 pb-[100px] overflow-y-auto overflow-x-visible">
              <div className="w-full px-2">{taskForm}</div>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTitle hidden>Create New Task</DrawerTitle>
      <DrawerContent className="p-6">
        <div className="w-full">{taskForm}</div>
      </DrawerContent>
    </Drawer>
  );
}
