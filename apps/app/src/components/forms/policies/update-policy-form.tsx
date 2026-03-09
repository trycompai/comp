'use client';

import { updatePolicyOverviewSchema } from '@/actions/schema';
import { usePermissions } from '@/hooks/use-permissions';
import { usePolicyMutations } from '@/hooks/use-policy-mutations';
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
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

interface UpdatePolicyFormProps {
  policy: Policy;
  onSuccess?: () => void;
}

export function UpdatePolicyForm({ policy, onSuccess }: UpdatePolicyFormProps) {
  const { hasPermission } = usePermissions();
  const { updatePolicy } = usePolicyMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof updatePolicyOverviewSchema>>({
    resolver: zodResolver(updatePolicyOverviewSchema),
    defaultValues: {
      id: policy.id,
      title: policy.name,
      description: policy.description ?? '',
      entityId: policy.id,
    },
  });

  const onSubmit = async (data: z.infer<typeof updatePolicyOverviewSchema>) => {
    setIsSubmitting(true);
    try {
      await updatePolicy(data.id, {
        name: data.title,
        description: data.description,
      });
      toast.success('Policy updated successfully');
      onSuccess?.();
    } catch {
      toast.error('Failed to update policy');
    } finally {
      setIsSubmitting(false);
    }
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
                  <Button type="submit" disabled={isSubmitting || !hasPermission('policy', 'update')}>
                    {isSubmitting ? 'Saving...' : 'Save'}
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
