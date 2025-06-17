'use client';

import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Textarea } from '@comp/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  createFrameworkAction,
  type CreateFrameworkActionState,
} from '../actions/create-framework-action';
import { FrameworkBaseSchema } from '../schemas';

interface CreateFrameworkDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onFrameworkCreated?: () => void;
}

const frameworkFormSchema = FrameworkBaseSchema;

type FrameworkFormValues = z.infer<typeof frameworkFormSchema>;

export function CreateFrameworkDialog({
  isOpen,
  onOpenChange,
  onFrameworkCreated,
}: CreateFrameworkDialogProps) {
  const [actionState, setActionState] = React.useState<CreateFrameworkActionState | undefined>(
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<FrameworkFormValues>({
    resolver: zodResolver(frameworkFormSchema),
    defaultValues: {
      name: '',
      description: '',
      version: '1.0.0',
      visible: true,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (!actionState) return;

    if (actionState.success) {
      toast.success('Framework created successfully!');
      onOpenChange(false);
      form.reset();
      if (onFrameworkCreated) {
        onFrameworkCreated();
      }
    } else if (actionState.error) {
      if (actionState.issues) {
        actionState.issues.forEach((issue) => {
          if (
            issue.path.length > 0 &&
            (issue.path[0] === 'name' ||
              issue.path[0] === 'description' ||
              issue.path[0] === 'version')
          ) {
            form.setError(issue.path[0] as keyof FrameworkFormValues, {
              type: 'server',
              message: issue.message,
            });
          } else {
            toast.error(issue.message);
          }
        });
      } else {
        toast.error(actionState.error);
      }
    }
    setActionState(undefined);
  }, [actionState, onOpenChange, onFrameworkCreated, form]);

  async function onSubmit(values: FrameworkFormValues) {
    const serverActionFormData = new FormData();
    serverActionFormData.append('name', values.name);
    serverActionFormData.append('description', values.description);
    serverActionFormData.append('version', values.version);
    serverActionFormData.append('visible', String(values.visible));

    const result = await createFrameworkAction(null, serverActionFormData);
    setActionState(result);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          form.reset();
          setActionState(undefined);
        }
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Framework</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new framework. Click create when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} ref={formRef} className="grid gap-2 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Name</FormLabel>
                  <FormControl className="col-span-3">
                    <Input placeholder="Enter framework name" {...field} />
                  </FormControl>
                  <div className="col-span-3 col-start-2">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Description</FormLabel>
                  <FormControl className="col-span-3">
                    <Textarea placeholder="Enter framework description" {...field} />
                  </FormControl>
                  <div className="col-span-3 col-start-2">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Version</FormLabel>
                  <FormControl className="col-span-3">
                    <Input placeholder="e.g., 1.0.0 or 2025 or V2" {...field} />
                  </FormControl>
                  <div className="col-span-3 col-start-2">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                  }}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating...' : 'Create Framework'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
