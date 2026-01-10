'use client';

import { researchVendorAction } from '@/actions/research-vendor';
import type { ActionResponse } from '@/types/actions';
import { SelectAssignee } from '@/components/SelectAssignee';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Textarea } from '@comp/ui/textarea';
import { type Member, type User, type Vendor, VendorCategory, VendorStatus } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightIcon } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { createVendorAction } from '../actions/create-vendor-action';
import { VendorNameAutocompleteField } from './VendorNameAutocompleteField';
import { createVendorSchema, type CreateVendorFormValues } from './create-vendor-form-schema';

export function CreateVendorForm({
  assignees,
  organizationId,
}: {
  assignees: (Member & { user: User })[];
  organizationId: string;
}) {
  const { mutate } = useSWRConfig();
  const [createVendorSheet, setCreateVendorSheet] = useQueryState('createVendorSheet');

  const isMountedRef = useRef(false);
  const pendingWebsiteRef = useRef<string | null>(null);

  const createVendor = useAction(createVendorAction, {
    onSuccess: async (result) => {
      const response = result.data as ActionResponse<Vendor> | undefined;
      
      // Check if the action returned success: false (e.g., duplicate vendor)
      if (response && response.success === false) {
        pendingWebsiteRef.current = null;
        const errorMessage = response.error || 'Failed to create vendor';
        toast.error(errorMessage);
        return;
      }

      // If we get here, vendor was created successfully
      
      // Run optional follow-up research FIRST (non-blocking)
      const website = pendingWebsiteRef.current;
      pendingWebsiteRef.current = null;
      if (website) {
        // Fire and forget - non-blocking
        researchVendor.execute({ website });
      }

      // Invalidate vendors cache
      mutate(
        (key) => Array.isArray(key) && key[0] === 'vendors',
        undefined,
        { revalidate: true },
      );

      // Show success toast
      toast.success('Vendor created successfully');
      
      // Close sheet last - use setTimeout to ensure it happens after all state updates
      setTimeout(() => {
        setCreateVendorSheet(null);
      }, 0);
    },
    onError: (error) => {
      // Handle thrown errors (shouldn't happen with our try-catch, but keep as fallback)
      const errorMessage = error.error?.serverError || 'Failed to create vendor';
      pendingWebsiteRef.current = null;
      toast.error(errorMessage);
    },
  });

  const researchVendor = useAction(researchVendorAction);

  const form = useForm<CreateVendorFormValues>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: {
      name: '',
      website: '',
      description: '',
      category: VendorCategory.cloud,
      status: VendorStatus.not_assessed,
    },
    mode: 'onChange',
  });

  // Reset form state when sheet closes
  useEffect(() => {
    const isOpen = Boolean(createVendorSheet);
    
    if (!isOpen && isMountedRef.current) {
      // Sheet was closed - reset all state
      form.reset({
        name: '',
        website: '',
        description: '',
        category: VendorCategory.cloud,
        status: VendorStatus.not_assessed,
      });
    } else if (isOpen) {
      // Sheet opened - mark as mounted
      isMountedRef.current = true;
    }
  }, [createVendorSheet, form]);

  const onSubmit = async (data: CreateVendorFormValues) => {
    // Prevent double-submits (also disabled via button state)
    if (createVendor.status === 'executing') return;

    pendingWebsiteRef.current = data.website ?? null;
    createVendor.execute({ ...data, organizationId });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* p-1 prevents focus ring (box-shadow) being clipped by overflow containers */}
        <div className="scrollbar-hide h-[calc(100vh-250px)] overflow-auto p-1">
          <div className="space-y-4">
            <VendorNameAutocompleteField form={form} isSheetOpen={Boolean(createVendorSheet)} />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{'Website'}</FormLabel>
                  <FormControl>
                    <Input {...field} className="mt-3" placeholder={'https://example.com'} />
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
                  <FormLabel>{'Description'}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="mt-3 min-h-[80px]"
                      placeholder={'Enter a description for the vendor...'}
                    />
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
                    <div className="mt-3">
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
                    </div>
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
                    <div className="mt-3">
                      <Select {...field} value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder={'Select a status...'} />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(VendorStatus).map((status) => {
                            const formattedStatus = status
                              .toLowerCase()
                              .split('_')
                              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(' ');
                            return (
                              <SelectItem key={status} value={status}>
                                {formattedStatus}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{'Assignee'}</FormLabel>
                  <FormControl>
                    <div className="mt-3">
                      <SelectAssignee
                        assignees={assignees}
                        assigneeId={field.value ?? null}
                        withTitle={false}
                        onAssigneeChange={field.onChange}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="submit" variant="default" disabled={createVendor.status === 'executing'}>
              <div className="flex items-center justify-center">
                {'Create Vendor'}
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </div>
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
