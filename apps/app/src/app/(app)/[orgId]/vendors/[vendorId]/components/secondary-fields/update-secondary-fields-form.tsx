'use client';

import { SelectAssignee } from '@/components/SelectAssignee';
import { VENDOR_STATUS_TYPES, VendorStatus } from '@/components/vendor-status';
import { useVendorActions } from '@/hooks/use-vendors';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Member, type User, type Vendor, VendorCategory } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { updateVendorSchema } from '../../actions/schema';

export function UpdateSecondaryFieldsForm({
  vendor,
  assignees,
  onUpdate,
}: {
  vendor: Vendor;
  assignees: (Member & { user: User })[];
  onUpdate?: () => void;
}) {
  const { updateVendor } = useVendorActions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof updateVendorSchema>>({
    resolver: zodResolver(updateVendorSchema),
    defaultValues: {
      id: vendor.id,
      name: vendor.name,
      description: vendor.description,
      assigneeId: vendor.assigneeId,
      category: vendor.category,
      status: vendor.status,
      website: vendor.website ?? '',
      isSubProcessor: vendor.isSubProcessor,
    },
  });

  const onSubmit = async (data: z.infer<typeof updateVendorSchema>) => {
    // Explicitly set assigneeId to null if it's an empty string (representing "None")
    const finalAssigneeId = data.assigneeId === '' ? null : data.assigneeId;

    setIsSubmitting(true);
    try {
      await updateVendor(data.id, {
        name: data.name,
        description: data.description,
        assigneeId: finalAssigneeId,
        category: data.category,
        status: data.status,
        website: data.website,
        isSubProcessor: data.isSubProcessor,
      });
      toast.success('Vendor updated successfully');
      onUpdate?.();
    } catch {
      toast.error('Failed to update vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{'Assignee'}</FormLabel>
                <FormControl>
                  <SelectAssignee
                    disabled={isSubmitting}
                    withTitle={false}
                    assignees={assignees}
                    assigneeId={field.value}
                    onAssigneeChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{'Status'}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={'Select a status...'}>
                        {field.value && <VendorStatus status={field.value} />}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(VENDOR_STATUS_TYPES).map((status) => (
                        <SelectItem key={status} value={status}>
                          <VendorStatus status={status} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{'Category'}</FormLabel>
                <FormControl>
                  <Select {...field} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={'Select a category...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(VendorCategory).map((category) => {
                        const formattedCategory = category
                          .toLowerCase()
                          .split('_')
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ');
                        return (
                          <SelectItem key={category} value={category}>
                            {formattedCategory}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
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
                <FormLabel>{'Website'}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="https://example.com"
                    disabled={isSubmitting}
                    type="url"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" variant="default" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
