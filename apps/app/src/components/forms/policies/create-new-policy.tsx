'use client';

import { createPolicyAction } from '@/actions/policies/create-new-policy';
import { getCreatePolicySchema } from '@/actions/schema';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Textarea } from '@comp/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { T, useGT } from 'gt-next';
import { ArrowRightIcon } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

export function CreateNewPolicyForm() {
  const t = useGT();
  const createPolicySchema = React.useMemo(() => getCreatePolicySchema(t), [t]);
  const [_, setCreatePolicySheet] = useQueryState('create-policy-sheet');

  const createPolicy = useAction(createPolicyAction, {
    onSuccess: () => {
      toast.success(t('Policy successfully created'));
      setCreatePolicySheet(null);
    },
    onError: () => {
      toast.error(t('Failed to create policy'));
    },
  });

  const form = useForm<z.infer<typeof createPolicySchema>>({
    resolver: zodResolver(createPolicySchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const onSubmit = (data: z.infer<ReturnType<typeof getCreatePolicySchema>>) => {
    createPolicy.execute(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="scrollbar-hide h-[calc(100vh-250px)] overflow-auto">
          <div>
            <Accordion type="multiple" defaultValue={['policy']}>
              <AccordionItem value="policy">
                <T>
                  <AccordionTrigger>Policy Details</AccordionTrigger>
                </T>
                <AccordionContent>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <T>
                            <FormLabel>Title</FormLabel>
                          </T>
                          <FormControl>
                            <Input
                              {...field}
                              autoFocus
                              className="mt-3"
                              placeholder={t('Title')}
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
                              placeholder={t('Description')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" variant="default" disabled={createPolicy.status === 'executing'}>
              <div className="flex items-center justify-center">
                {t('Create')}
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </div>
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
