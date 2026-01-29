'use client';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import type { Vendor } from '@db';
import { Button } from '@comp/ui/button';
import { Input, Stack, Textarea } from '@trycompai/design-system';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useVendor } from '@/hooks/use-vendor';

interface UpdateTitleAndDescriptionFormProps {
  vendor: Vendor;
  onSuccess?: () => void;
}

export function UpdateTitleAndDescriptionForm({
  vendor,
  onSuccess,
}: UpdateTitleAndDescriptionFormProps) {
  const { updateVendor, isUpdating } = useVendor(vendor.id, { enabled: false });

  const form = useForm<{ name: string; description: string }>({
    defaultValues: {
      name: vendor.name,
      description: vendor.description,
    },
  });

  const onSubmit = async (data: { name: string; description: string }) => {
    const trimmedName = data.name.trim();
    const trimmedDescription = data.description.trim();

    const updates: { name?: string; description?: string } = {};
    if (trimmedName !== vendor.name) {
      updates.name = trimmedName;
    }
    if (trimmedDescription !== vendor.description) {
      updates.description = trimmedDescription;
    }

    if (Object.keys(updates).length === 0) {
      onSuccess?.();
      return;
    }

    try {
      await updateVendor(vendor.id, updates);
      toast.success('Vendor updated successfully');
      onSuccess?.();
    } catch (error) {
      console.error('Error updating vendor:', error);
      toast.error('Failed to update vendor');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Stack gap="4">
          <FormField
            control={form.control}
            name="name"
            rules={{ required: 'Name is required' }}
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
        </Stack>
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
