'use client';

import { useFrameworks } from '@/hooks/use-frameworks';
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
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().max(2000),
  version: z.string().max(40).optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateCustomFrameworkSheet() {
  const { hasPermission } = usePermissions();
  const { createCustomFramework } = useFrameworks();
  const router = useRouter();
  const params = useParams<{ orgId: string }>();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', version: '1.0' },
    mode: 'onChange',
  });

  if (!hasPermission('framework', 'create')) return null;

  const handleSubmit = async (values: FormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const created = await createCustomFramework(values);
      toast.success('Custom framework created');
      setIsOpen(false);
      form.reset();
      if (created?.id && params?.orgId) {
        router.push(`/${params.orgId}/frameworks/${created.id}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create framework',
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
        Add Custom Framework
      </Button>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create Custom Framework</SheetTitle>
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
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="1.0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    Create Framework
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
