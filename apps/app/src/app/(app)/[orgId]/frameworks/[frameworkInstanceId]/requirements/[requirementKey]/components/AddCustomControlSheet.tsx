'use client';

import { useControls } from '@/app/(app)/[orgId]/controls/hooks/useControls';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
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
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().min(1, 'Description is required').max(4000),
});

type FormValues = z.infer<typeof schema>;

export function AddCustomControlSheet({
  frameworkInstanceId,
  requirementId,
  isCustomRequirement,
}: {
  frameworkInstanceId: string;
  requirementId: string;
  isCustomRequirement: boolean;
}) {
  const { hasPermission } = usePermissions();
  const { createControl } = useControls();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
    mode: 'onChange',
  });

  if (!hasPermission('control', 'create')) return null;

  const handleSubmit = async (values: FormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createControl({
        name: values.name,
        description: values.description,
        requirementMappings: [
          isCustomRequirement
            ? { customRequirementId: requirementId, frameworkInstanceId }
            : { requirementId, frameworkInstanceId },
        ],
      });
      toast.success('Control created');
      setIsOpen(false);
      form.reset();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create control',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        iconLeft={<Add size={16} />}
        onClick={() => setIsOpen(true)}
      >
        Add Control
      </Button>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Custom Control</SheetTitle>
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
                        <Input {...field} placeholder="Access Control" />
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
                          className="min-h-[120px]"
                          placeholder="Describe what this control enforces..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    Add Control
                  </Button>
                </div>
              </form>
            </Form>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
