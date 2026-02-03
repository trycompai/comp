'use client';

import { SelectAssignee } from '@/components/SelectAssignee';
import { VENDOR_STATUS_TYPES, VendorStatus } from '@/components/vendor-status';
import { Button } from '@comp/ui/button';
import { Checkbox } from '@comp/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import { Member, type User, type Vendor, VendorCategory } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { HelpCircle, Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { updateVendorSchema } from '../../actions/schema';
import { updateVendorAction } from '../../actions/update-vendor-action';

export function UpdateSecondaryFieldsForm({
  vendor,
  assignees,
}: {
  vendor: Vendor;
  assignees: (Member & { user: User })[];
}) {
  const updateVendor = useAction(updateVendorAction, {
    onSuccess: () => {
      toast.success('Vendor updated successfully');
    },
    onError: () => {
      toast.error('Failed to update vendor');
    },
  });

  const form = useForm<z.infer<typeof updateVendorSchema>>({
    resolver: zodResolver(updateVendorSchema),
    defaultValues: {
      id: vendor.id,
      name: vendor.name,
      description: vendor.description,
      assigneeId: vendor.assigneeId,
      category: vendor.category,
      status: vendor.status,
      isSubProcessor: vendor.isSubProcessor,
    },
  });

  const onSubmit = (data: z.infer<typeof updateVendorSchema>) => {
    // Explicitly set assigneeId to null if it's an empty string (representing "None")
    const finalAssigneeId = data.assigneeId === '' ? null : data.assigneeId;

    updateVendor.execute({
      id: data.id,
      name: data.name,
      description: data.description,
      assigneeId: finalAssigneeId, // Use the potentially nulled value
      category: data.category,
      status: data.status,
      isSubProcessor: data.isSubProcessor,
    });
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
                    disabled={updateVendor.status === 'executing'}
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
        </div>
        <FormField
          control={form.control}
          name="isSubProcessor"
          render={({ field }) => (
            <FormItem className="mt-4 flex flex-row items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  id="isSubProcessor"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={updateVendor.status === 'executing'}
                />
              </FormControl>
              <label
                htmlFor="isSubProcessor"
                className="cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Sub-processor
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="text-muted-foreground h-4 w-4 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      A sub-processor is a third party engaged by a vendor to process personal data
                      on behalf of your organization.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </FormItem>
          )}
        />
        <div className="mt-4 flex justify-end">
          <Button type="submit" variant="default" disabled={updateVendor.status === 'executing'}>
            {updateVendor.status === 'executing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
