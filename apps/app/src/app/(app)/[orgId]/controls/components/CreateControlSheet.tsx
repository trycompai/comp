'use client';

import { createControlAction } from '@/actions/controls/create-control-action';
import { Button } from '@comp/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@comp/ui/drawer';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { useMediaQuery } from '@comp/ui/hooks';
import { Input } from '@comp/ui/input';
import MultipleSelector, { Option } from '@comp/ui/multiple-selector';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@comp/ui/sheet';
import { Textarea } from '@comp/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightIcon, X } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const createControlSchema = z.object({
  name: z.string().min(1, {
    message: 'Name is required',
  }),
  description: z.string().min(1, {
    message: 'Description is required',
  }),
  policyIds: z.array(z.string()).optional(),
  taskIds: z.array(z.string()).optional(),
  requirementMappings: z
    .array(
      z.object({
        requirementId: z.string(),
        frameworkInstanceId: z.string(),
      }),
    )
    .optional(),
});

export function CreateControlSheet({
  policies,
  tasks,
  requirements,
}: {
  policies: { id: string; name: string }[];
  tasks: { id: string; title: string }[];
  requirements: {
    id: string;
    name: string;
    identifier: string;
    frameworkInstanceId: string;
    frameworkName: string;
  }[];
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [createControlOpen, setCreateControlOpen] = useQueryState('create-control');
  const isOpen = Boolean(createControlOpen);

  const handleOpenChange = (open: boolean) => {
    setCreateControlOpen(open ? 'true' : null);
  };

  const createControl = useAction(createControlAction, {
    onSuccess: () => {
      toast.success('Control created successfully');
      setCreateControlOpen(null);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.error?.serverError || 'Failed to create control');
    },
  });

  const form = useForm<z.infer<typeof createControlSchema>>({
    resolver: zodResolver(createControlSchema),
    defaultValues: {
      name: '',
      description: '',
      policyIds: [],
      taskIds: [],
      requirementMappings: [],
    },
  });

  const onSubmit = useCallback(
    (data: z.infer<typeof createControlSchema>) => {
      createControl.execute(data);
    },
    [createControl],
  );

  // Memoize policy options to prevent re-renders
  const policyOptions = useMemo(
    () =>
      policies.map((policy) => ({
        value: policy.id,
        label: policy.name,
      })),
    [policies],
  );

  // Memoize task options to prevent re-renders
  const taskOptions = useMemo(
    () =>
      tasks.map((task) => ({
        value: task.id,
        label: task.title,
      })),
    [tasks],
  );

  // Memoize requirement options to prevent re-renders
  const requirementOptions = useMemo(
    () =>
      requirements.map((req) => ({
        value: req.id,
        label: `${req.frameworkName}: ${req.identifier} - ${req.name}`,
        frameworkInstanceId: req.frameworkInstanceId,
      })),
    [requirements],
  );

  // Memoize filter functions
  const policyFilterFunction = useCallback(
    (value: string, search: string) => {
      const option = policyOptions.find((opt) => opt.value === value);
      if (!option) return 0;
      return option.label.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
    },
    [policyOptions],
  );

  const taskFilterFunction = useCallback(
    (value: string, search: string) => {
      const option = taskOptions.find((opt) => opt.value === value);
      if (!option) return 0;
      return option.label.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
    },
    [taskOptions],
  );

  // Memoize change handlers
  const handlePoliciesChange = useCallback((options: Option[], onChange: (value: any) => void) => {
    onChange(options.map((option) => option.value));
  }, []);

  const handleTasksChange = useCallback((options: Option[], onChange: (value: any) => void) => {
    onChange(options.map((option) => option.value));
  }, []);

  const requirementFilterFunction = useCallback(
    (value: string, search: string) => {
      const option = requirementOptions.find((opt) => opt.value === value);
      if (!option) return 0;
      return option.label.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
    },
    [requirementOptions],
  );

  const handleRequirementsChange = useCallback(
    (options: (Option & { frameworkInstanceId?: string })[], onChange: (value: any) => void) => {
      const mappings = options.map((option) => ({
        requirementId: option.value,
        frameworkInstanceId: option.frameworkInstanceId || '',
      }));
      onChange(mappings);
    },
    [],
  );

  const controlForm = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full max-w-none">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Control Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="A descriptive name for the control"
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
                  placeholder="Provide a detailed description of the control"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="policyIds"
          render={({ field }) => {
            const selectedOptions: Option[] = (field.value || [])
              .map((id) => {
                const policy = policies.find((p) => p.id === id);
                return policy ? { value: policy.id, label: policy.name } : null;
              })
              .filter(Boolean) as Option[];

            return (
              <FormItem className="w-full">
                <FormLabel>Policies (Optional)</FormLabel>
                <FormControl>
                  <div className="relative overflow-visible">
                    <MultipleSelector
                      value={selectedOptions}
                      onChange={(options) => handlePoliciesChange(options, field.onChange)}
                      defaultOptions={policyOptions}
                      placeholder="Search and select policies..."
                      emptyIndicator={
                        <p className="text-center text-lg leading-10 text-muted-foreground">
                          No policies found.
                        </p>
                      }
                      className="[&_[cmdk-list]]:!z-[9999] [&_[cmdk-list]]:!fixed"
                      commandProps={{
                        filter: policyFilterFunction,
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="taskIds"
          render={({ field }) => {
            const selectedOptions: Option[] = (field.value || [])
              .map((id) => {
                const task = tasks.find((t) => t.id === id);
                return task ? { value: task.id, label: task.title } : null;
              })
              .filter(Boolean) as Option[];

            return (
              <FormItem className="w-full">
                <FormLabel>Tasks (Optional)</FormLabel>
                <FormControl>
                  <div className="relative overflow-visible">
                    <MultipleSelector
                      value={selectedOptions}
                      onChange={(options) => handleTasksChange(options, field.onChange)}
                      defaultOptions={taskOptions}
                      placeholder="Search and select tasks..."
                      emptyIndicator={
                        <p className="text-center text-lg leading-10 text-muted-foreground">
                          No tasks found.
                        </p>
                      }
                      className="[&_[cmdk-list]]:!z-[9999] [&_[cmdk-list]]:!fixed"
                      commandProps={{
                        filter: taskFilterFunction,
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="requirementMappings"
          render={({ field }) => {
            const selectedOptions: (Option & { frameworkInstanceId?: string })[] = (
              field.value || []
            )
              .map((mapping) => {
                const req = requirements.find((r) => r.id === mapping.requirementId);
                return req
                  ? {
                      value: req.id,
                      label: `${req.frameworkName}: ${req.identifier} - ${req.name}`,
                      frameworkInstanceId: req.frameworkInstanceId,
                    }
                  : null;
              })
              .filter(Boolean) as (Option & { frameworkInstanceId?: string })[];

            return (
              <FormItem className="w-full">
                <FormLabel>Requirements (Optional)</FormLabel>
                <FormControl>
                  <div className="relative overflow-visible">
                    <MultipleSelector
                      value={selectedOptions}
                      onChange={(options) =>
                        handleRequirementsChange(
                          options as (Option & { frameworkInstanceId?: string })[],
                          field.onChange,
                        )
                      }
                      defaultOptions={
                        requirementOptions as (Option & { frameworkInstanceId?: string })[]
                      }
                      placeholder="Search and select requirements..."
                      emptyIndicator={
                        <p className="text-center text-lg leading-10 text-muted-foreground">
                          No requirements found.
                        </p>
                      }
                      className="[&_[cmdk-list]]:!z-[9999] [&_[cmdk-list]]:!fixed"
                      commandProps={{
                        filter: requirementFilterFunction,
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </form>
    </Form>
  );

  if (isDesktop) {
    return (
      <>
        <Sheet open={isOpen} onOpenChange={handleOpenChange}>
          <SheetContent stack className="flex flex-col h-full">
            <SheetHeader className="mb-6 flex flex-row items-center justify-between flex-shrink-0">
              <SheetTitle>Create New Control</SheetTitle>
              <Button
                size="icon"
                variant="ghost"
                className="m-0 size-auto p-0 hover:bg-transparent"
                onClick={() => setCreateControlOpen(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="px-2 pb-6">{controlForm}</div>
            </div>

            {/* Fixed Footer with Submit Button */}
            <div className="border-t bg-background p-4 flex justify-end flex-shrink-0">
              <Button
                type="submit"
                disabled={createControl.status === 'executing'}
                onClick={form.handleSubmit(onSubmit)}
              >
                <div className="flex items-center justify-center">
                  Create Control
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </div>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTitle hidden>Create New Control</DrawerTitle>
      <DrawerContent className="flex flex-col h-full max-h-[80vh]">
        <div className="flex-1 overflow-y-auto p-6 pb-0">
          <div className="w-full pb-6">{controlForm}</div>
        </div>

        {/* Fixed Footer with Submit Button */}
        <div className="border-t bg-background p-4 flex justify-end flex-shrink-0">
          <Button
            type="submit"
            disabled={createControl.status === 'executing'}
            onClick={form.handleSubmit(onSubmit)}
          >
            <div className="flex items-center justify-center">
              Create Control
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </div>
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
