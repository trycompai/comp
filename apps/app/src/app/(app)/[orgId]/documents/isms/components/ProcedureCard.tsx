'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Field,
  FieldError,
  Heading,
  HStack,
  Stack,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { Edit } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { parseProcedure } from './management-review-constants';
import { IsmsRegisterCard } from './shared';

const procedureSchema = z.object({
  procedure: z.string().trim().min(1, 'The procedure paragraph is required'),
});

type ProcedureFormValues = z.infer<typeof procedureSchema>;

interface ProcedureCardProps {
  narrative: unknown;
  canEdit: boolean;
  onSave: (procedure: string) => Promise<void>;
}

/**
 * The review Procedure paragraph (top of the Management Review page). Ships
 * with a hardcoded default and is rendered verbatim into the generated
 * clause-9.3 document; the customer edits it in place.
 */
export function ProcedureCard({ narrative, canEdit, onSave }: ProcedureCardProps) {
  const procedure = parseProcedure(narrative);
  const [isEditing, setIsEditing] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<ProcedureFormValues>({
    resolver: zodResolver(procedureSchema),
    mode: 'onChange',
    defaultValues: { procedure },
  });

  useEffect(() => {
    if (!isEditing) reset({ procedure });
  }, [procedure, isEditing, reset]);

  const handleSave = handleSubmit(async (values) => {
    try {
      await onSave(values.procedure.trim());
    } catch {
      return;
    }
    setIsEditing(false);
  });

  const headerActions = canEdit ? (
    isEditing ? (
      <HStack align="center" gap="2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            reset({ procedure });
            setIsEditing(false);
          }}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleSave}
          disabled={!isDirty || !isValid || isSubmitting}
          loading={isSubmitting}
        >
          Save
        </Button>
      </HStack>
    ) : (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        iconLeft={<Edit size={16} />}
        aria-label="Edit procedure"
      >
        Edit
      </Button>
    )
  ) : undefined;

  return (
    <IsmsRegisterCard
      header={
        <Stack gap="1">
          <Heading level="4">Procedure</Heading>
          <Text size="sm" variant="muted">
            Rendered verbatim into the generated Clause 9.3 document.
          </Text>
        </Stack>
      }
      headerEnd={headerActions}
    >
      {isEditing ? (
        <Field>
          <Controller
            control={control}
            name="procedure"
            render={({ field: { ref: _ref, ...field }, fieldState }) => (
              <>
                <Textarea {...field} rows={4} aria-label="Review procedure" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </>
            )}
          />
        </Field>
      ) : (
        // whitespace-pre-wrap inherits into the Text span, preserving the
        // paragraph breaks a multi-line procedure was written with.
        <div className="whitespace-pre-wrap">
          <Text size="sm">{procedure || 'No procedure recorded yet.'}</Text>
        </div>
      )}
    </IsmsRegisterCard>
  );
}
