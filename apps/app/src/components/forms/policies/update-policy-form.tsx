'use client';

import { updatePolicyOverviewAction } from '@/actions/policies/update-policy-overview-action';
import { updatePolicyOverviewSchema } from '@/actions/schema';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import type { Policy } from '@db';
import { Button } from '@comp/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Input,
  Stack,
  Textarea,
} from '@trycompai/design-system';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

interface UpdatePolicyFormProps {
  policy: Policy;
  onSuccess?: () => void;
}

export function UpdatePolicyForm({ policy, onSuccess }: UpdatePolicyFormProps) {
  const updatePolicy = useAction(updatePolicyOverviewAction, {
    onSuccess: () => {
      toast.success('Policy updated successfully');
      onSuccess?.();
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
      <Accordion defaultValue={['policy']}>
        <AccordionItem value="policy">
          <AccordionTrigger>Policy</AccordionTrigger>
          <AccordionContent>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Stack gap="md">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Policy Title</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoFocus
                          placeholder="Policy Title"
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
                          placeholder="A brief summary of the policy's purpose."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={updatePolicy.status === 'executing'}>
                    {updatePolicy.status === 'executing' ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </Stack>
            </form>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Form>
  );
}
