'use client';

import { apiClient } from '@/app/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@trycompai/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@trycompai/ui/form';
import { Input } from '@trycompai/ui/input';
import { Textarea } from '@trycompai/ui/textarea';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FrameworkBaseSchema } from '../schemas';

interface CreateFrameworkDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onFrameworkCreated?: () => void;
}

type FrameworkFormValues = z.infer<typeof FrameworkBaseSchema>;

export function CreateFrameworkDialog({
  isOpen,
  onOpenChange,
  onFrameworkCreated,
}: CreateFrameworkDialogProps) {
  const router = useRouter();

  const form = useForm<FrameworkFormValues>({
    resolver: zodResolver(FrameworkBaseSchema),
    defaultValues: {
      name: '',
      description: '',
      version: '1.0.0',
      visible: true,
    },
    mode: 'onChange',
  });

  async function onSubmit(values: FrameworkFormValues) {
    try {
      await apiClient('/framework', {
        method: 'POST',
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          version: values.version,
          visible: values.visible,
        }),
      });
      toast.success('Framework created successfully!');
      onOpenChange(false);
      form.reset();
      onFrameworkCreated?.();
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create framework.';
      toast.error(message);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          form.reset();
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-2 py-4">
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
