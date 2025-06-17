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
import { Switch } from '@comp/ui/switch';
import { Textarea } from '@comp/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import type { FrameworkEditorFramework } from '@prisma/client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { updateFrameworkAction } from '../../actions/update-framework-action'; // Adjusted path
import { FrameworkBaseSchema } from '../../schemas'; // Import shared schema

interface EditFrameworkDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  framework: Pick<FrameworkEditorFramework, 'id' | 'name' | 'description' | 'version' | 'visible'>;
  onFrameworkUpdated?: (
    updatedData: Pick<
      FrameworkEditorFramework,
      'id' | 'name' | 'description' | 'version' | 'visible'
    >,
  ) => void;
}

const frameworkFormSchema = FrameworkBaseSchema; // Use shared schema

type FrameworkFormValues = z.infer<typeof frameworkFormSchema>;

export function EditFrameworkDialog({
  isOpen,
  onOpenChange,
  framework,
  onFrameworkUpdated,
}: EditFrameworkDialogProps) {
  const form = useForm<FrameworkFormValues>({
    resolver: zodResolver(frameworkFormSchema),
    defaultValues: {
      name: framework.name,
      description: framework.description,
      version: framework.version,
      visible: framework.visible,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    // Reset form when framework prop changes (e.g. when dialog is reopened with different data)
    form.reset({
      name: framework.name,
      description: framework.description,
      version: framework.version,
      visible: framework.visible,
    });
  }, [framework, form]);

  async function onSubmit(values: FrameworkFormValues) {
    const formData = new FormData();
    formData.append('id', framework.id);
    formData.append('name', values.name);
    formData.append('description', values.description);
    formData.append('version', values.version);
    formData.append('visible', String(values.visible));

    const result = await updateFrameworkAction(null, formData);

    if (result.success && result.data) {
      toast.success('Framework updated successfully!');
      onOpenChange(false); // Close dialog on success
      if (onFrameworkUpdated) {
        onFrameworkUpdated(result.data);
      }
    } else if (result.error) {
      if (result.issues) {
        result.issues.forEach((issue: z.ZodIssue) => {
          if (
            issue.path &&
            issue.path.length > 0 &&
            (issue.path[0] === 'name' ||
              issue.path[0] === 'description' ||
              issue.path[0] === 'version' ||
              issue.path[0] === 'visible')
          ) {
            form.setError(issue.path[0] as keyof FrameworkFormValues, {
              type: 'server',
              message: issue.message,
            });
          } else {
            toast.error(issue.message); // General validation error not tied to a field
          }
        });
      } else {
        toast.error(result.error);
      }
    } else {
      toast.error('An unexpected error occurred.');
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          // Optionally reset form if dialog is closed manually without saving,
          // though useEffect above handles pre-fill/reset on open/data change
          form.reset({
            name: framework.name,
            description: framework.description,
            version: framework.version,
            visible: framework.visible,
          });
        }
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Framework</DialogTitle>
          <DialogDescription>
            Update the details for the framework. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-2">
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
                    <Input placeholder="e.g., 1.0.0" {...field} />
                  </FormControl>
                  <div className="col-span-3 col-start-2">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="visible"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Visible</FormLabel>
                  <FormControl className="col-span-3">
                    <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="col-span-3 col-start-2">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || !form.formState.isDirty}
              >
                {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
