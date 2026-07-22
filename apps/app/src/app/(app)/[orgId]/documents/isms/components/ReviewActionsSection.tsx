'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Badge,
  Button,
  Field,
  FieldError,
  Heading,
  HStack,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { Controller, useForm } from 'react-hook-form';
import type { IsmsManagementReview } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import { ReviewActionRow } from './ReviewActionRow';
import {
  reviewActionSchema,
  type ReviewActionFormValues,
} from './management-review-schema';
import { IsmsAddCard, IsmsFieldLabel } from './shared';

const NO_OWNER = 'no-owner';

interface ReviewActionsSectionProps {
  review: IsmsManagementReview;
  canEdit: boolean;
  /** Signed review: no add/delete (the arising set is frozen), updates stay live. */
  locked: boolean;
  memberOptions: ApproverOption[];
  onCreateAction: (values: ReviewActionFormValues) => Promise<void>;
  onUpdateAction: (actionId: string, payload: Record<string, unknown>) => Promise<void>;
  onDeleteAction: (actionId: string) => Promise<void>;
}

const EMPTY_ACTION: ReviewActionFormValues = {
  description: '',
  ownerMemberId: '',
  dueDate: '',
  status: 'open',
};

/**
 * Actions arising (9.3.3): the review's tracked follow-ups. An empty table is
 * fine — the document renders "No actions arising from this review". Open
 * actions carry forward to the next review's input (a) automatically. After
 * the chair signs, the set is frozen but each action still tracks to closure.
 */
export function ReviewActionsSection({
  review,
  canEdit,
  locked,
  memberOptions,
  onCreateAction,
  onUpdateAction,
  onDeleteAction,
}: ReviewActionsSectionProps) {
  const actions = review.actions;

  return (
    <Stack gap="3">
      <HStack align="center" gap="2">
        <Heading level="5">Actions arising</Heading>
        <Badge variant="secondary">{String(actions.length)}</Badge>
      </HStack>
      <Text size="sm" variant="muted">
        Follow-ups agreed at this review, tracked to closure. Open actions carry forward to the
        next review&apos;s input (a) automatically — no actions is fine.
      </Text>

      {actions.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
                {canEdit ? <TableHead aria-label="Actions" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.map((action) => (
                <ReviewActionRow
                  key={action.id}
                  review={review}
                  action={action}
                  canEdit={canEdit}
                  locked={locked}
                  memberOptions={memberOptions}
                  onUpdateAction={onUpdateAction}
                  onDeleteAction={onDeleteAction}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {canEdit && !locked ? (
        <IsmsAddCard addLabel="Add action" formTitle="New action">
          {({ close }) => (
            <AddActionForm
              memberOptions={memberOptions}
              onAdd={onCreateAction}
              onClose={close}
            />
          )}
        </IsmsAddCard>
      ) : null}
    </Stack>
  );
}

function AddActionForm({
  memberOptions,
  onAdd,
  onClose,
}: {
  memberOptions: ApproverOption[];
  onAdd: (values: ReviewActionFormValues) => Promise<void>;
  onClose: () => void;
}) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ReviewActionFormValues>({
    resolver: zodResolver(reviewActionSchema),
    defaultValues: EMPTY_ACTION,
  });

  const handleAdd = handleSubmit(async (values) => {
    try {
      await onAdd(values);
    } catch {
      // Keep the user's input and the form open when the save fails.
      return;
    }
    reset(EMPTY_ACTION);
    onClose();
  });

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-3">
      <IsmsFieldLabel label="Description">
        <Field>
          <Controller
            control={control}
            name="description"
            render={({ field: { ref: _ref, ...field }, fieldState }) => (
              <>
                <Textarea
                  {...field}
                  rows={2}
                  aria-label="Action description"
                  placeholder="What was agreed, specific enough to verify when done"
                />
                <FieldError>{fieldState.error?.message}</FieldError>
              </>
            )}
          />
        </Field>
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Owner">
        <Controller
          control={control}
          name="ownerMemberId"
          render={({ field }) => (
            <Select
              value={field.value || NO_OWNER}
              onValueChange={(next) => field.onChange(next === NO_OWNER ? '' : next)}
            >
              <SelectTrigger aria-label="Action owner">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_OWNER}>Unassigned</SelectItem>
                {memberOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Due date">
        <Controller
          control={control}
          name="dueDate"
          render={({ field: { ref: _ref, ...field } }) => (
            <Input {...field} type="date" aria-label="Action due date" />
          )}
        />
      </IsmsFieldLabel>
      <HStack justify="end">
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          loading={isSubmitting}
          disabled={isSubmitting}
          iconLeft={<Add size={16} />}
        >
          Add action
        </Button>
      </HStack>
    </form>
  );
}
