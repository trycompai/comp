'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Label,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { Save } from '@trycompai/design-system/icons';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { IsmsLeadershipNarrative } from '../isms-types';
import { LeadershipCommitmentRow } from './LeadershipCommitmentRow';
import {
  buildFormValues,
  LEADERSHIP_COMMITMENTS,
  leadershipNarrativeSchema,
  type LeadershipNarrativeValues,
} from './leadership-schema';

interface LeadershipFormProps {
  narrative: Partial<IsmsLeadershipNarrative> | null;
  canEdit: boolean;
  onSave: (values: LeadershipNarrativeValues) => Promise<void>;
}

/**
 * Structured narrative form for the Leadership and Commitment document. Renders
 * the overall management statement plus the eight ISO 27001 clause 5.1 (a)-(h)
 * commitments as labelled editable rows. Read-only users see plain text.
 */
export function LeadershipForm({ narrative, canEdit, onSave }: LeadershipFormProps) {
  const { control, handleSubmit, reset, formState } = useForm<LeadershipNarrativeValues>({
    resolver: zodResolver(leadershipNarrativeSchema),
    defaultValues: buildFormValues(narrative),
  });

  // Re-seed the form whenever the persisted narrative changes (e.g. after generate).
  useEffect(() => {
    reset(buildFormValues(narrative));
  }, [narrative, reset]);

  const statement = useWatch({ control, name: 'statement' });
  const commitments = useWatch({ control, name: 'commitments' });

  const handleSave = handleSubmit(async (values) => {
    await onSave(values);
  });

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="leadership-statement">Commitment statement</Label>
        {canEdit ? (
          <Controller
            control={control}
            name="statement"
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea
                {...field}
                id="leadership-statement"
                rows={5}
                placeholder="Overall statement of top-management leadership and commitment to the ISMS."
                aria-label="Commitment statement"
              />
            )}
          />
        ) : (
          <span className="text-sm">{statement || '—'}</span>
        )}
        {formState.errors.statement && (
          <span className="text-xs text-destructive">{formState.errors.statement.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Text size="base" weight="semibold">
          Leadership commitments (clause 5.1 a–h)
        </Text>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Commitment</TableHead>
              <TableHead>How it is demonstrated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {LEADERSHIP_COMMITMENTS.map((meta, index) => (
              <LeadershipCommitmentRow
                key={meta.key}
                meta={meta}
                index={index}
                canEdit={canEdit}
                control={control}
                text={commitments?.[index]?.text ?? ''}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="secondary"
            loading={formState.isSubmitting}
            disabled={formState.isSubmitting}
            iconLeft={<Save size={16} />}
          >
            Save document
          </Button>
        </div>
      )}
    </form>
  );
}
