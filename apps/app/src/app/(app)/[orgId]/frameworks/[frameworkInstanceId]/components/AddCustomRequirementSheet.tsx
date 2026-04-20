'use client';

import { apiClient } from '@/lib/api-client';
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
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  identifier: z.string().min(1, 'Identifier is required').max(80),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(4000),
});

type FormValues = z.infer<typeof schema>;

export function AddCustomRequirementSheet({
  frameworkInstanceId,
}: {
  frameworkInstanceId: string;
}) {
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', name: '', description: '' },
    mode: 'onChange',
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({ identifier: '', name: '', description: '' });
    }
  }, [isOpen, form]);

  if (!hasPermission('framework', 'update')) return null;

  const handleSubmit = async (values: FormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await apiClient.post(
        `/v1/frameworks/${frameworkInstanceId}/requirements`,
        values,
      );
      if (response.error) throw new Error(response.error);
      toast.success('Requirement added');
      setIsOpen(false);
      form.reset();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add requirement',
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
        Add Requirement
      </Button>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Custom Requirement</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Identifier</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="10.3" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Access Review" />
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
                          placeholder="Describe the requirement..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    Add Requirement
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
