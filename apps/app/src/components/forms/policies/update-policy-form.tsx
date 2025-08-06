'use client';

import { updatePolicyOverviewAction } from '@/actions/policies/update-policy-overview-action';
import { getUpdatePolicyOverviewSchema } from '@/actions/schema';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Textarea } from '@comp/ui/textarea';
import { Policy } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { T, useGT } from 'gt-next';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

export function UpdatePolicyForm({ policy }: { policy: Policy }) {
  const [open, setOpen] = useQueryState('policy-overview-sheet');
  const t = useGT();
  const updatePolicyOverviewSchema = React.useMemo(() => getUpdatePolicyOverviewSchema(t), [t]);

  const updatePolicy = useAction(updatePolicyOverviewAction, {
    onSuccess: () => {
      toast.success(t('Policy updated successfully'));
      setOpen(null);
    },
    onError: () => {
      toast.error(t('Failed to update policy'));
    },
  });

  const form = useForm<z.infer<typeof updatePolicyOverviewSchema>>({
    resolver: zodResolver(updatePolicyOverviewSchema),
    defaultValues: {
      id: policy.id,
      title: policy.name,
      description: policy.description ?? '',
      isRequiredToSign: policy.isRequiredToSign ? 'required' : 'not_required',
      entityId: policy.id,
    },
  });

  const onSubmit = (data: z.infer<ReturnType<typeof getUpdatePolicyOverviewSchema>>) => {
    console.log(data);
    updatePolicy.execute({
      id: data.id,
      title: data.title,
      description: data.description,
      isRequiredToSign: data.isRequiredToSign,
      entityId: data.id,
    });
  };

  return (
    <Form {...form}>
      <div className="scrollbar-hide h-[calc(100vh-250px)] overflow-auto">
        <Accordion type="multiple" defaultValue={['policy']}>
          <AccordionItem value="policy">
            <T>
              <AccordionTrigger>Policy</AccordionTrigger>
            </T>
            <AccordionContent>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <T>
                          <FormLabel>Policy Title</FormLabel>
                        </T>
                        <FormControl>
                          <Input
                            {...field}
                            autoFocus
                            className="mt-3"
                            placeholder={t('Policy Title')}
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
                        <T>
                          <FormLabel>Description</FormLabel>
                        </T>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="mt-3 min-h-[80px]"
                            placeholder={t("A brief summary of the policy's purpose.")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isRequiredToSign"
                    render={({ field }) => (
                      <FormItem>
                        <T>
                          <FormLabel>Signature Requirement</FormLabel>
                        </T>
                        <FormControl>
                          <div className="mt-3">
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder={t('Select signature requirement')} />
                              </SelectTrigger>
                              <SelectContent>
                                <T>
                                  <SelectItem value="required">Required</SelectItem>
                                </T>
                                <T>
                                  <SelectItem value="not_required">Not Required</SelectItem>
                                </T>
                              </SelectContent>
                            </Select>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="mt-8 flex justify-end">
                  <Button
                    type="submit"
                    variant="default"
                    disabled={updatePolicy.status === 'executing'}
                  >
                    {updatePolicy.status === 'executing' ? (
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
