'use client';

import { createRiskSchema } from '@/actions/schema';
import { SelectAssignee } from '@/components/SelectAssignee';
import { useRiskActions } from '@/hooks/use-risks';
import { Button } from '@comp/ui/button';
import type { Member, User } from '@db';
import { Departments, RiskCategory } from '@db';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  HStack,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SheetFooter,
  Textarea,
} from '@trycompai/design-system';
import { ArrowRight } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import type { z } from 'zod';

interface CreateRiskProps {
  assignees: (Member & { user: User })[];
  onSuccess?: () => void;
}

export function CreateRisk({ assignees, onSuccess }: CreateRiskProps) {
  const { createRisk } = useRiskActions();
  const { mutate } = useSWRConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<z.infer<typeof createRiskSchema>>({
    resolver: zodResolver(createRiskSchema),
    defaultValues: {
      title: '',
      description: '',
      category: RiskCategory.operations,
      department: Departments.admin,
      assigneeId: null,
    },
  });

  const onSubmit = async (data: z.infer<typeof createRiskSchema>) => {
    setIsSubmitting(true);
    try {
      await createRisk(data);
      toast.success('Risk created successfully');
      onSuccess?.();
      mutate((key) => Array.isArray(key) && key[0] === 'risks', undefined, { revalidate: true });
    } catch {
      toast.error('Failed to create risk');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="title">Risk Title</FieldLabel>
          <Input
            id="title"
            {...register('title')}
            autoFocus
            placeholder="A short, descriptive title for the risk."
            autoCorrect="off"
          />
          <FieldError errors={[errors.title]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="A detailed description of the risk, its potential impact, and its causes."
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Category</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
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
              <FieldError errors={[errors.category]} />
            </Field>
          )}
        />

        <Controller
          name="department"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Department</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Departments).map((department) => (
                    <SelectItem key={department} value={department}>
                      {department.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[errors.department]} />
            </Field>
          )}
        />

        <Controller
          name="assigneeId"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Assignee</FieldLabel>
              <SelectAssignee
                assigneeId={field.value ?? null}
                assignees={assignees}
                onAssigneeChange={field.onChange}
                disabled={isSubmitting}
                withTitle={false}
              />
              <FieldError errors={[errors.assigneeId]} />
            </Field>
          )}
        />
      </FieldGroup>

      <SheetFooter>
        <HStack justify="end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create'}
            {!isSubmitting && <ArrowRight size={16} className="ml-2" />}
          </Button>
        </HStack>
      </SheetFooter>
    </form>
  );
}
