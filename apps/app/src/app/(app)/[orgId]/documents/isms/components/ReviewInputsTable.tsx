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
import { ReviewInputRow } from './ReviewInputRow';
import {
  reviewInputSchema,
  type ReviewInputFormValues,
} from './management-review-schema';
import { IsmsAddCard, IsmsFieldLabel } from './shared';

interface ReviewInputsTableProps {
  review: IsmsManagementReview;
  canEdit: boolean;
  onCreateInput: (values: ReviewInputFormValues) => Promise<void>;
  onUpdateInput: (inputId: string, payload: Record<string, unknown>) => Promise<void>;
  onDeleteInput: (inputId: string) => Promise<void>;
}

const EMPTY_INPUT: ReviewInputFormValues = {
  inputRef: '',
  whatItCovers: '',
  whereToFind: '',
  discussionNotes: '',
};

/**
 * The Inputs (9.3.2) table — the heart of the review and the meeting agenda.
 * Ten default rows are seeded per review (inputs (a)-(g), with (d) split into
 * four); working through them in order covers everything ISO requires. For
 * each row: open the "Where to find it" location, discuss it, capture notes,
 * and tick Discussed?. Rows can be added, edited, or removed freely.
 */
export function ReviewInputsTable({
  review,
  canEdit,
  onCreateInput,
  onUpdateInput,
  onDeleteInput,
}: ReviewInputsTableProps) {
  const inputs = review.inputs;
  const discussedCount = inputs.filter((input) => input.discussed).length;

  return (
    <Stack gap="3">
      <HStack align="center" gap="2">
        <Heading level="5">Inputs (9.3.2)</Heading>
        <Badge variant="secondary">{`${discussedCount} of ${inputs.length} discussed`}</Badge>
      </HStack>
      <Text size="sm" variant="muted">
        This table is the meeting agenda. For each input: open the &quot;Where to find it&quot;
        location, review the current state before or during the meeting, add discussion notes,
        and tick Discussed?. The ten defaults are the ISO-mandated set — not recommended to
        remove any without justification.
      </Text>

      {inputs.length === 0 ? (
        <Text size="sm" variant="muted">
          No inputs recorded for this review.
        </Text>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Input</TableHead>
                <TableHead>What it covers</TableHead>
                <TableHead>Where to find it</TableHead>
                <TableHead>Discussion notes</TableHead>
                <TableHead>Discussed?</TableHead>
                {canEdit ? <TableHead aria-label="Actions" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {inputs.map((input) => (
                <ReviewInputRow
                  key={input.id}
                  input={input}
                  canEdit={canEdit}
                  onUpdateInput={onUpdateInput}
                  onDeleteInput={onDeleteInput}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {canEdit ? (
        <IsmsAddCard addLabel="Add input row" formTitle="New input row">
          {({ close }) => <AddInputForm onAdd={onCreateInput} onClose={close} />}
        </IsmsAddCard>
      ) : null}
    </Stack>
  );
}

function AddInputForm({
  onAdd,
  onClose,
}: {
  onAdd: (values: ReviewInputFormValues) => Promise<void>;
  onClose: () => void;
}) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ReviewInputFormValues>({
    resolver: zodResolver(reviewInputSchema),
    defaultValues: EMPTY_INPUT,
  });

  const handleAdd = handleSubmit(async (values) => {
    try {
      await onAdd(values);
    } catch {
      // Keep the user's input and the form open when the save fails.
      return;
    }
    reset(EMPTY_INPUT);
    onClose();
  });

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-3">
      <IsmsFieldLabel label="Input reference">
        <Field>
          <Controller
            control={control}
            name="inputRef"
            render={({ field: { ref: _ref, ...field }, fieldState }) => (
              <>
                <Input
                  {...field}
                  aria-label="Input reference"
                  placeholder="e.g. (h) Budget and resourcing"
                />
                <FieldError>{fieldState.error?.message}</FieldError>
              </>
            )}
          />
        </Field>
      </IsmsFieldLabel>
      <IsmsFieldLabel label="What it covers">
        <Controller
          control={control}
          name="whatItCovers"
          render={({ field: { ref: _ref, ...field } }) => (
            <Input {...field} aria-label="What it covers" />
          )}
        />
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Where to find it">
        <Controller
          control={control}
          name="whereToFind"
          render={({ field: { ref: _ref, ...field } }) => (
            <Input
              {...field}
              aria-label="Where to find it"
              placeholder="Comp AI > ... or an external location"
            />
          )}
        />
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Discussion notes (optional)">
        <Controller
          control={control}
          name="discussionNotes"
          render={({ field: { ref: _ref, ...field } }) => (
            <Textarea
              {...field}
              rows={2}
              aria-label="Discussion notes"
              placeholder="What was discussed for this input — the minutes for this row"
            />
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
          Add input row
        </Button>
      </HStack>
    </form>
  );
}
