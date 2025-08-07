'use client';

import { updatePolicyOverviewAction } from '@/actions/policies/update-policy-overview-action';
import { updatePolicyOverviewSchema } from '@/actions/schema';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Textarea } from '@comp/ui/textarea';
import { Policy } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

export function UpdatePolicyForm({ policy }: { policy: Policy }) {
  const [open, setOpen] = useQueryState('policy-overview-sheet');

  const updatePolicy = useAction(updatePolicyOverviewAction, {
    onSuccess: () => {
      toast.success('Policy updated successfully');
      setOpen(null);
    },
    onError: () => {
      toast.error('Failed to update policy');
    },
  });

  const form = useForm<z.infer<typeof updatePolicyOverviewSchema>>({
    resolver: zodResolver(updatePolicyOverviewSchema),
    defaultValues: {
      id: policy.id,
      title: policy.name,
      description: policy.description ?? '',
      entityId: policy.id,
    },
  });

  const onSubmit = (data: z.infer<typeof updatePolicyOverviewSchema>) => {
    console.log(data);
    updatePolicy.execute({
      id: data.id,
      title: data.title,
      description: data.description,
      entityId: data.id,
    });
  };

  return (
    <Form {...form}>
      <div className="scrollbar-hide h-[calc(100vh-250px)] overflow-auto">
        <Accordion type="multiple" defaultValue={['policy']}>
          <AccordionItem value="policy">
            <AccordionTrigger>{'Policy'}</AccordionTrigger>
            <AccordionContent>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{'Policy Title'}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            autoFocus
                            className="mt-3"
                            placeholder={'Policy Title'}
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
                            className="mt-3 min-h-[80px]"
                            placeholder={"A brief summary of the policy's purpose."}
                          />
                        </FormControl>
                        <FormMessage />
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
                      'Save'
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
