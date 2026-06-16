'use client';

import { Badge, TableCell, TableRow, Text, Textarea } from '@trycompai/design-system';
import { Controller, type Control } from 'react-hook-form';
import type { LeadershipCommitmentMeta, LeadershipNarrativeValues } from './leadership-schema';

interface LeadershipCommitmentRowProps {
  meta: LeadershipCommitmentMeta;
  index: number;
  canEdit: boolean;
  control: Control<LeadershipNarrativeValues>;
  text: string;
}

/**
 * One ISO 27001 clause 5.1 commitment, rendered as a labelled row. Editable as a
 * `Textarea` (RHF Controller) for users with `evidence:update`, otherwise plain
 * read-only text.
 */
export function LeadershipCommitmentRow({
  meta,
  index,
  canEdit,
  control,
  text,
}: LeadershipCommitmentRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge variant="secondary">{meta.clause}</Badge>
          <Text size="sm" weight="medium">
            {meta.label}
          </Text>
        </div>
      </TableCell>
      <TableCell>
        {canEdit ? (
          <Controller
            control={control}
            name={`commitments.${index}.text`}
            render={({ field: { ref: _ref, ...field } }) => (
              <Textarea
                {...field}
                rows={3}
                placeholder={meta.placeholder}
                aria-label={`Commitment ${meta.clause}`}
              />
            )}
          />
        ) : (
          <span className="text-sm">{text || '—'}</span>
        )}
      </TableCell>
    </TableRow>
  );
}
