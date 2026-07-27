'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Badge,
  Field,
  FieldError,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { categoriesForKind, type IsmsContextIssue } from '../isms-types';
import { issueSchema, type IssueFormValues } from './issue-schema';
import {
  IsmsCardActions,
  IsmsFieldLabel,
  IsmsRegisterCard,
  IsmsSourceBadge,
} from './shared';

interface IssueRowProps {
  issue: IsmsContextIssue;
  canEdit: boolean;
  onSave: (params: IssueFormValues) => Promise<void>;
  onDelete: () => Promise<void>;
}

function toFormValues(issue: IsmsContextIssue, fallbackCategory: string): IssueFormValues {
  return {
    category: issue.category ?? fallbackCategory,
    description: issue.description,
    effect: issue.effect,
  };
}

export function IssueRow({ issue, canEdit, onSave, onDelete }: IssueRowProps) {
  const categories = categoriesForKind(issue.kind);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting, errors },
  } = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    mode: 'onChange',
    defaultValues: toFormValues(issue, categories[0]),
  });

  // Re-sync the form from the latest record whenever it changes while the row is
  // not being edited (e.g. after a successful save revalidates), so re-opening
  // edit never shows stale values.
  useEffect(() => {
    if (!isEditing) reset(toFormValues(issue, categories[0]));
  }, [issue, isEditing, reset, categories]);

  const handleEdit = () => {
    reset(toFormValues(issue, categories[0]));
    setIsEditing(true);
  };

  const handleCancel = () => {
    reset(toFormValues(issue, categories[0]));
    setIsEditing(false);
  };

  const handleSave = handleSubmit(async (values) => {
    try {
      await onSave(values);
    } catch {
      // Stay in edit mode with the user's changes when the save fails.
      return;
    }
    setIsEditing(false);
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const actions = canEdit ? (
    <IsmsCardActions
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      onDelete={handleDelete}
      isDirty={isDirty && isValid}
      isSaving={isSubmitting}
      isDeleting={isDeleting}
      editLabel="Edit issue"
      deleteLabel="Delete issue"
    />
  ) : undefined;

  // Edit mode keeps the roomier labelled form.
  if (isEditing) {
    return (
      <IsmsRegisterCard
        header={<IsmsSourceBadge source={issue.source} derivedFrom={issue.derivedFrom} />}
        headerEnd={actions}
      >
        <Stack gap="3">
          <IsmsFieldLabel label="Category">
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Issue category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </IsmsFieldLabel>
          <IsmsFieldLabel label="Issue">
            <Field>
              <Controller
                control={control}
                name="description"
                render={({ field: { ref: _ref, ...field } }) => (
                  <Textarea {...field} rows={3} aria-label="Issue description" />
                )}
              />
              <FieldError>{errors.description?.message}</FieldError>
            </Field>
          </IsmsFieldLabel>
          <IsmsFieldLabel label="Effect on ISMS">
            <Field>
              <Controller
                control={control}
                name="effect"
                render={({ field: { ref: _ref, ...field } }) => (
                  <Textarea {...field} rows={3} aria-label="Issue effect" />
                )}
              />
              <FieldError>{errors.effect?.message}</FieldError>
            </Field>
          </IsmsFieldLabel>
        </Stack>
      </IsmsRegisterCard>
    );
  }

  // Read mode: dense two-line row (issue + effect), category + source pills, hover actions.
  return (
    <div className="group flex items-start justify-between gap-3 rounded-md border border-border bg-card px-3.5 py-2.5 transition-colors hover:border-foreground/20">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Text size="sm" weight="medium">
          {issue.description}
        </Text>
        <Text size="xs" variant="muted">
          {issue.effect}
        </Text>
        <div className="flex flex-wrap items-center gap-2">
          {issue.category && <Badge variant="secondary">{issue.category}</Badge>}
          <IsmsSourceBadge source={issue.source} derivedFrom={issue.derivedFrom} />
        </div>
      </div>
      {actions && (
        <div className="shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}
