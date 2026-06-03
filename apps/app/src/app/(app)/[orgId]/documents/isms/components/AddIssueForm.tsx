'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Field,
  FieldError,
  HStack,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { Controller, useForm } from 'react-hook-form';
import { categoriesForKind, type IsmsContextIssueKind } from '../isms-types';
import { issueSchema, type IssueFormValues } from './issue-schema';
import { IsmsAddCard, IsmsFieldLabel } from './shared';

interface AddIssueFormProps {
  kind: IsmsContextIssueKind;
  onAdd: (params: IssueFormValues) => Promise<void>;
}

export function AddIssueForm({ kind, onAdd }: AddIssueFormProps) {
  return (
    <IsmsAddCard addLabel={`Add ${kind} issue`} formTitle={`New ${kind} issue`}>
      {({ close }) => <AddIssueFields kind={kind} onAdd={onAdd} onClose={close} />}
    </IsmsAddCard>
  );
}

function AddIssueFields({
  kind,
  onAdd,
  onClose,
}: AddIssueFormProps & { onClose: () => void }) {
  const categories = categoriesForKind(kind);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: { category: categories[0], description: '', effect: '' },
  });

  const handleAdd = handleSubmit(async (values) => {
    try {
      await onAdd(values);
    } catch {
      // Keep the user's input and the form open when the save fails.
      return;
    }
    reset({ category: categories[0], description: '', effect: '' });
    onClose();
  });

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-3">
      <IsmsFieldLabel label="Category">
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger aria-label={`New ${kind} issue category`}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError>{errors.category?.message}</FieldError>
      </IsmsFieldLabel>
      <div className="grid gap-3 md:grid-cols-2">
        <Field>
          <Controller
            control={control}
            name="description"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea
                {...field}
                rows={2}
                placeholder={`New ${kind} issue description`}
                aria-label={`New ${kind} issue description`}
              />
            )}
          />
          <FieldError>{errors.description?.message}</FieldError>
        </Field>
        <Field>
          <Controller
            control={control}
            name="effect"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea
                {...field}
                rows={2}
                placeholder="Effect on the ISMS and its objectives"
                aria-label={`New ${kind} issue effect`}
              />
            )}
          />
          <FieldError>{errors.effect?.message}</FieldError>
        </Field>
      </div>
      <HStack justify="end">
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          loading={isSubmitting}
          disabled={isSubmitting}
          iconLeft={<Add size={16} />}
        >
          Add {kind} issue
        </Button>
      </HStack>
    </form>
  );
}
