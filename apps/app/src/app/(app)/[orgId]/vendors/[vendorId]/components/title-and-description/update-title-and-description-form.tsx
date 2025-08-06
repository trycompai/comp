'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Textarea } from '@comp/ui/textarea';
import type { Vendor } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { T, useGT } from 'gt-next';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { getUpdateVendorSchema } from '../../actions/schema';
import { updateVendorAction } from '../../actions/update-vendor-action';

export function UpdateTitleAndDescriptionForm({ vendor }: { vendor: Vendor }) {
  const [open, setOpen] = useQueryState('vendor-overview-sheet');
  const t = useGT();

  const updateVendor = useAction(updateVendorAction, {
    onSuccess: () => {
      toast.success(t('Vendor updated successfully'));
      setOpen(null);
    },
    onError: (error) => {
      console.error('Error updating vendor:', error);
      toast.error(t('Failed to update vendor'));
    },
  });

  const form = useForm<z.infer<ReturnType<typeof getUpdateVendorSchema>>>({
    resolver: zodResolver(getUpdateVendorSchema(t)),
    defaultValues: {
      id: vendor.id,
      name: vendor.name,
      description: vendor.description,
      category: vendor.category,
      status: vendor.status,
      assigneeId: vendor.assigneeId,
    },
  });

  const onSubmit = (data: z.infer<ReturnType<typeof getUpdateVendorSchema>>) => {
    updateVendor.execute({
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      status: data.status,
      assigneeId: data.assigneeId,
    });
  };

  return (
    <Form {...form}>
      <div className="scrollbar-hide h-[calc(100vh-250px)] overflow-auto">
        <Accordion type="multiple" defaultValue={['vendor']}>
          <AccordionItem value="vendor">
            <AccordionTrigger>
              <T>Vendor</T>
            </AccordionTrigger>
            <AccordionContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <T>Name</T>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoFocus
                          className="mt-3"
                          placeholder={t('A short, descriptive name for the vendor.')}
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
                      <FormLabel>
                        <T>Description</T>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="mt-3 min-h-[80px]"
                          placeholder={t('A detailed description of the vendor and its services.')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="mt-8 flex justify-end">
                  <Button
                    type="submit"
                    variant="default"
                    disabled={updateVendor.status === 'executing'}
                  >
                    {updateVendor.status === 'executing' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <T>Save</T>
                    )}
                  </Button>
                </div>
              </form>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Form>
  );
}
