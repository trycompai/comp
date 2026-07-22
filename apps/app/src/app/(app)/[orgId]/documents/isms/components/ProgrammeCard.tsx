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
import { parseProgramme } from './internal-audit-constants';
import { IsmsRegisterCard } from './shared';

const programmeSchema = z.object({
  programme: z.string().trim().min(1, 'The programme paragraph is required'),
});

type ProgrammeFormValues = z.infer<typeof programmeSchema>;

interface ProgrammeCardProps {
  narrative: unknown;
  canEdit: boolean;
  onSave: (programme: string) => Promise<void>;
}

/**
 * The audit Programme paragraph (top of the Internal Audit page). Ships with a
 * hardcoded default and is rendered verbatim into the generated clause-9.2
 * document; the customer edits it in place.
 */
export function ProgrammeCard({ narrative, canEdit, onSave }: ProgrammeCardProps) {
  const programme = parseProgramme(narrative);
  const [isEditing, setIsEditing] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<ProgrammeFormValues>({
    resolver: zodResolver(programmeSchema),
    mode: 'onChange',
    defaultValues: { programme },
  });

  useEffect(() => {
    if (!isEditing) reset({ programme });
  }, [programme, isEditing, reset]);

  const handleSave = handleSubmit(async (values) => {
    try {
      await onSave(values.programme.trim());
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
            reset({ programme });
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
        aria-label="Edit programme"
      >
        Edit
      </Button>
    )
  ) : undefined;

  return (
    <IsmsRegisterCard
      header={
        <Stack gap="1">
          <Heading level="4">Programme</Heading>
          <Text size="sm" variant="muted">
            Rendered verbatim into the generated Clause 9.2 document.
          </Text>
        </Stack>
      }
      headerEnd={headerActions}
    >
      {isEditing ? (
        <Field>
          <Controller
            control={control}
            name="programme"
            render={({ field: { ref: _ref, ...field }, fieldState }) => (
              <>
                <Textarea {...field} rows={4} aria-label="Audit programme" />
                <FieldError>{fieldState.error?.message}</FieldError>
              </>
            )}
          />
        </Field>
      ) : (
        // whitespace-pre-wrap inherits into the Text span, preserving the
        // paragraph breaks a multi-line programme was written with.
        <div className="whitespace-pre-wrap">
          <Text size="sm">{programme || 'No programme recorded yet.'}</Text>
        </div>
      )}
    </IsmsRegisterCard>
  );
}
