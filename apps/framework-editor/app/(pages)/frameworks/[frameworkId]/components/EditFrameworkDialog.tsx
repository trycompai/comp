'use client';

import { apiClient } from '@/app/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Switch,
  Textarea,
} from '@trycompai/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FrameworkBaseSchema } from '../../schemas';

interface FrameworkData {
  id: string;
  name: string;
  description: string;
  version: string;
  visible: boolean;
}

interface EditFrameworkDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  framework: FrameworkData;
  onFrameworkUpdated?: (updatedData: FrameworkData) => void;
}

type FrameworkFormValues = z.infer<typeof FrameworkBaseSchema>;

export function EditFrameworkDialog({
  isOpen,
  onOpenChange,
  framework,
  onFrameworkUpdated,
}: EditFrameworkDialogProps) {
  const router = useRouter();

  const form = useForm<FrameworkFormValues>({
    resolver: zodResolver(FrameworkBaseSchema),
    defaultValues: {
      name: framework.name,
      description: framework.description,
      version: framework.version,
      visible: framework.visible,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset({
      name: framework.name,
      description: framework.description,
      version: framework.version,
      visible: framework.visible,
    });
  }, [framework, form]);

  async function onSubmit(values: FrameworkFormValues) {
    try {
      const updatedFramework = await apiClient<FrameworkData>(`/framework/${framework.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          version: values.version,
          visible: values.visible,
        }),
      });
      toast.success('Framework updated successfully!');
      onOpenChange(false);
      onFrameworkUpdated?.(updatedFramework);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update framework.';
      toast.error(message);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
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
