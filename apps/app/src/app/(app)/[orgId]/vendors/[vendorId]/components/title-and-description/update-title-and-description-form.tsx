'use client';

import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import type { Vendor } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Stack, Textarea } from '@trycompai/design-system';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { updateVendorSchema } from '../../actions/schema';
import { updateVendorAction } from '../../actions/update-vendor-action';

interface UpdateTitleAndDescriptionFormProps {
  vendor: Vendor;
  onSuccess?: () => void;
}

export function UpdateTitleAndDescriptionForm({
  vendor,
  onSuccess,
}: UpdateTitleAndDescriptionFormProps) {
  const updateVendor = useAction(updateVendorAction, {
    onSuccess: () => {
      toast.success('Vendor updated successfully');
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Error updating vendor:', error);
      toast.error('Failed to update vendor');
    },
  });

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

  const onSubmit = (data: z.infer<typeof updateVendorSchema>) => {
    updateVendor.execute({
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      status: data.status,
      assigneeId: data.assigneeId,
      website: data.website,
    });
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
            <Button type="submit" disabled={updateVendor.status === 'executing'}>
              {updateVendor.status === 'executing' ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </Stack>
      </form>
    </Form>
  );
}
