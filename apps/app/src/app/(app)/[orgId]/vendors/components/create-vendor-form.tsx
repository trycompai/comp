'use client';

import { useApi } from '@/hooks/use-api';
import { researchVendorAction } from '@/actions/research-vendor';
import { SelectAssignee } from '@/components/SelectAssignee';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Textarea } from '@comp/ui/textarea';
import { type Member, type User, VendorCategory, VendorStatus } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightIcon } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { VendorNameAutocompleteField } from './VendorNameAutocompleteField';
import { createVendorSchema, type CreateVendorFormValues } from './create-vendor-form-schema';

export function CreateVendorForm({
  assignees,
  organizationId,
  onSuccess,
}: {
  assignees: (Member & { user: User })[];
  organizationId: string;
  onSuccess?: () => void;
}) {
  const { mutate } = useSWRConfig();
  const api = useApi();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingWebsiteRef = useRef<string | null>(null);

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

  const onSubmit = async (data: CreateVendorFormValues) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    pendingWebsiteRef.current = data.website ?? null;

    try {
      const response = await api.post('/v1/vendors', {
        name: data.name,
        description: data.description || '',
        category: data.category,
        status: data.status,
        website: data.website || undefined,
        assigneeId: data.assigneeId,
      });

      if (response.error) throw new Error(response.error);

      // Run optional follow-up research (non-blocking)
      const website = pendingWebsiteRef.current;
      pendingWebsiteRef.current = null;
      if (website) {
        researchVendor.execute({ website });
      }

      // Invalidate vendors cache
      mutate(
        (key) => Array.isArray(key) && key[0] === 'vendors',
        undefined,
        { revalidate: true },
      );

      toast.success('Vendor created successfully');
      onSuccess?.();
      router.refresh();
    } catch (error) {
      pendingWebsiteRef.current = null;
      toast.error(error instanceof Error ? error.message : 'Failed to create vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* p-1 prevents focus ring (box-shadow) being clipped by overflow containers */}
        <div className="scrollbar-hide h-[calc(100vh-250px)] overflow-auto p-1">
          <div className="space-y-4">
            <VendorNameAutocompleteField form={form} />
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
            <Button type="submit" variant="default" disabled={isSubmitting}>
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
