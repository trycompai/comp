'use client';

import { updateRiskAction } from '@/actions/risk/update-risk-action';
import { updateRiskSchema } from '@/actions/schema';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Textarea } from '@comp/ui/textarea';
import { Departments, type Risk } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

export function UpdateRiskForm({ risk }: { risk: Risk }) {
  const [open, setOpen] = useQueryState('risk-overview-sheet');

  const updateRisk = useAction(updateRiskAction, {
    onSuccess: () => {
      toast.success('Risk updated successfully');
      setOpen(null);
    },
    onError: () => {
      toast.error('Failed to update risk');
    },
  });

  const form = useForm<z.infer<typeof updateRiskSchema>>({
    resolver: zodResolver(updateRiskSchema),
    defaultValues: {
      id: risk.id,
      title: risk.title,
      description: risk.description,
      category: risk.category,
      department: risk.department ?? Departments.admin,
      status: risk.status,
      assigneeId: risk.assigneeId,
    },
  });

  const onSubmit = (data: z.infer<typeof updateRiskSchema>) => {
    updateRisk.execute({
      id: data.id,
      title: data.title,
      description: data.description,
      category: data.category,
      department: data.department,
      status: data.status,
      assigneeId: data.assigneeId,
    });
  };

  return (
    <Form {...form}>
      <div className="scrollbar-hide h-[calc(100vh-250px)] overflow-auto">
        <Accordion type="multiple" defaultValue={['risk']}>
          <AccordionItem value="risk">
            <AccordionTrigger>{'Risk'}</AccordionTrigger>
            <AccordionContent>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{'Risk Title'}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            autoFocus
                            className="mt-3"
                            placeholder={'A short, descriptive title for the risk.'}
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
                            placeholder={
                              'A detailed description of the risk, its potential impact, and its causes.'
                            }
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
                    disabled={updateRisk.status === 'executing'}
                  >
                    {updateRisk.status === 'executing' ? (
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
