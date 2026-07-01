'use client';

import { useFrameworks } from '@/hooks/use-frameworks';
import { usePermissions } from '@/hooks/use-permissions';
import type { FrameworkInstanceWithControls } from '@/lib/types/framework';
import {
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@trycompai/design-system';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@trycompai/ui/form';
import { Input } from '@trycompai/ui/input';
import { Textarea } from '@trycompai/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().max(2000),
});

type FormValues = z.infer<typeof schema>;

interface EditCustomFrameworkSheetProps {
  isOpen: boolean;
  onClose: () => void;
  frameworkInstance: FrameworkInstanceWithControls;
  onUpdated?: () => void;
}

export function EditCustomFrameworkSheet({
  isOpen,
  onClose,
  frameworkInstance,
  onUpdated,
}: EditCustomFrameworkSheetProps) {
  const { updateCustomFramework } = useFrameworks();
  const { hasPermission } = usePermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: frameworkInstance.customFramework?.name ?? '',
      description: frameworkInstance.customFramework?.description ?? '',
    },
    mode: 'onChange',
  });

  // Refresh the form with the latest values each time the sheet opens.
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: frameworkInstance.customFramework?.name ?? '',
        description: frameworkInstance.customFramework?.description ?? '',
      });
    }
  }, [isOpen, frameworkInstance, form]);

  if (!hasPermission('framework', 'update')) return null;

  const handleSubmit = async (values: FormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateCustomFramework(frameworkInstance.id, values);
      toast.success('Custom framework updated');
      onUpdated?.();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update framework',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Custom Framework</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Internal Controls Framework"
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
                      <Textarea
                        {...field}
                        className="min-h-[100px]"
                        placeholder="Describe what this framework covers..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
