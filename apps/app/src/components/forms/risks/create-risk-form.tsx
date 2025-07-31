'use client';

import { createRiskAction } from '@/actions/risk/create-risk-action';
import { createRiskSchema } from '@/actions/schema';
import { SelectAssignee } from '@/components/SelectAssignee';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Textarea } from '@comp/ui/textarea';
import type { Member, RiskStatus, User } from '@db';
import { Departments, RiskCategory } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightIcon } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useQueryState } from 'nuqs';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

export function CreateRisk({ assignees }: { assignees: (Member & { user: User })[] }) {
  // Get the same query parameters as the table
  const [search] = useQueryState('search');
  const [page] = useQueryState('page', {
    defaultValue: 1,
    parse: Number.parseInt,
  });
  const [pageSize] = useQueryState('pageSize', {
    defaultValue: 10,
    parse: Number,
  });
  const [status] = useQueryState<RiskStatus | null>('status', {
    defaultValue: null,
    parse: (value) => value as RiskStatus | null,
  });
  const [department] = useQueryState<Departments | null>('department', {
    defaultValue: null,
    parse: (value) => value as Departments | null,
  });
  const [assigneeId] = useQueryState<string | null>('assigneeId', {
    defaultValue: null,
    parse: (value) => value,
  });

  const [_, setCreateRiskSheet] = useQueryState('create-risk-sheet');

  const createRisk = useAction(createRiskAction, {
    onSuccess: async () => {
      toast.success('Risk created successfully');
      setCreateRiskSheet(null);
    },
    onError: () => {
      toast.error('Failed to create risk');
    },
  });

  const form = useForm<z.infer<typeof createRiskSchema>>({
    resolver: zodResolver(createRiskSchema),
    defaultValues: {
      title: '',
      description: '',
      category: RiskCategory.operations,
      department: Departments.admin,
      assigneeId: null,
    },
  });

  const onSubmit = (data: z.infer<typeof createRiskSchema>) => {
    createRisk.execute(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="scrollbar-hide h-[calc(100vh-250px)] overflow-auto">
          <div>
            <Accordion type="multiple" defaultValue={['risk']}>
              <AccordionItem value="risk">
                <AccordionTrigger>{'Risk Details'}</AccordionTrigger>
                <AccordionContent>
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
                          <FormLabel>{'Description'}</FormLabel>
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
                                  <SelectValue placeholder={'Select a category'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.values(RiskCategory).map((category) => {
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
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{'Department'}</FormLabel>
                          <FormControl>
                            <div className="mt-3">
                              <Select {...field} value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                  <SelectValue placeholder={'Select a department'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.values(Departments).map((department) => {
                                    const formattedDepartment = department.toUpperCase();

                                    return (
                                      <SelectItem key={department} value={department}>
                                        {formattedDepartment}
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
                                assigneeId={field.value ?? null}
                                assignees={assignees}
                                onAssigneeChange={field.onChange}
                                disabled={createRisk.status === 'executing'}
                                withTitle={false}
                              />
                            </div>
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
            <Button type="submit" variant="default" disabled={createRisk.status === 'executing'}>
              <div className="flex items-center justify-center">
                {'Create'}
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </div>
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
