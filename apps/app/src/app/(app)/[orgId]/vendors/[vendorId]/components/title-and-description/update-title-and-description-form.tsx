'use client';

import { useVendorActions } from '@/hooks/use-vendors';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import type { Vendor } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Stack, Textarea } from '@trycompai/design-system';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import type { z } from 'zod';
import { updateVendorSchema } from '../../actions/schema';

interface UpdateTitleAndDescriptionFormProps {
  vendor: Vendor;
  onSuccess?: () => void;
}

export function UpdateTitleAndDescriptionForm({
  vendor,
  onSuccess,
}: UpdateTitleAndDescriptionFormProps) {
  const { updateVendor } = useVendorActions();
  const { mutate: globalMutate } = useSWRConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof updateVendorSchema>>({
    resolver: zodResolver(updateVendorSchema),
    defaultValues: {
      id: vendor.id,
      name: vendor.name,
      description: vendor.description,
      category: vendor.category,
      status: vendor.status,
      assigneeId: vendor.assigneeId,
      website: vendor.website ?? '',
    },
  });

  const onSubmit = async (data: z.infer<typeof updateVendorSchema>) => {
    setIsSubmitting(true);
    try {
      await updateVendor(data.id, {
        name: data.name,
        description: data.description,
        category: data.category,
        status: data.status,
        assigneeId: data.assigneeId,
        website: data.website === '' ? undefined : data.website,
      });

      toast.success('Vendor updated successfully');
      globalMutate(
        (key) =>
          (Array.isArray(key) && key[0]?.includes('/v1/vendors')) ||
          (typeof key === 'string' && key.includes('/v1/vendors')),
        undefined,
        { revalidate: true },
      );
      onSuccess?.();
    } catch {
      toast.error('Failed to update vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap="4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoFocus
                    placeholder="A short, descriptive name for the vendor."
                    autoCorrect="off"
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
                    value={field.value ?? ''}
                    placeholder="A detailed description of the vendor and its services."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    placeholder="https://example.com"
                    autoCorrect="off"
                    inputMode="url"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </Stack>
      </form>
    </Form>
  );
}
