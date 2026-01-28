'use client';

import { SelectAssignee, type AssigneeOption } from '@/components/SelectAssignee';
import { VENDOR_STATUS_TYPES, VendorStatus } from '@/components/vendor-status';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { VendorCategory, type VendorStatus as VendorStatusEnum } from '@db';
import { useVendor } from '@/hooks/use-vendor';
import type { VendorResponse } from '@/hooks/use-vendors';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useCallback } from 'react';

export function UpdateSecondaryFieldsForm({
  vendor,
  assignees,
  onMutate,
}: {
  vendor: Pick<VendorResponse, 'id' | 'assigneeId' | 'category' | 'status'>;
  assignees: AssigneeOption[];
  onMutate?: () => void;
}) {
  const { updateVendor, isUpdating } = useVendor(vendor.id, { enabled: false });

  const form = useForm<{
    assigneeId: string | null;
    category: VendorCategory;
    status: VendorStatusEnum;
  }>({
    defaultValues: {
      assigneeId: vendor.assigneeId,
      category: vendor.category,
      status: vendor.status,
    },
  });

  const executeSave = useCallback(
    async (data: {
      assigneeId?: string | null;
      category?: VendorCategory;
      status?: VendorStatusEnum;
    }) => {
      const finalAssigneeId = data.assigneeId === '' ? null : data.assigneeId;
      try {
        await updateVendor(vendor.id, {
          ...(data.assigneeId !== undefined ? { assigneeId: finalAssigneeId } : {}),
          ...(data.category ? { category: data.category } : {}),
          ...(data.status ? { status: data.status } : {}),
        });
        onMutate?.();
        toast.success('Vendor updated');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update vendor');
      }
    },
    [updateVendor, vendor.id],
  );


  return (
    <Form {...form}>
      <form>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{'Assignee'}</FormLabel>
                <FormControl>
                  <SelectAssignee
                    disabled={isUpdating}
                    withTitle={false}
                    assignees={assignees}
                    assigneeId={field.value}
                    onAssigneeChange={(value) => {
                      field.onChange(value);
                      if (isUpdating) return;
                      executeSave({ assigneeId: value === '' ? null : value });
                    }}
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
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      const status = value as VendorStatusEnum;
                      field.onChange(status);
                      if (isUpdating) return;
                      executeSave({ status });
                    }}
                    disabled={isUpdating}
                  >
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
                  <Select
                    {...field}
                    value={field.value}
                    onValueChange={(value) => {
                      const category = value as VendorCategory;
                      field.onChange(category);
                      if (isUpdating) return;
                      executeSave({ category });
                    }}
                    disabled={isUpdating}
                  >
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
        </div>
      </form>
    </Form>
  );
}
