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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { Controller, useForm } from 'react-hook-form';
import type { IsmsAudit, IsmsAuditControl } from '../isms-types';
import { AuditControlRow, type RaisedResult } from './AuditControlRow';
import {
  auditControlSchema,
  type AuditControlFormValues,
} from './audit-schema';
import { IsmsAddCard, IsmsFieldLabel } from './shared';

interface AuditControlsTableProps {
  audit: IsmsAudit;
  canEdit: boolean;
  onCreateControl: (values: AuditControlFormValues) => Promise<void>;
  onUpdateControl: (controlId: string, payload: Record<string, unknown>) => Promise<void>;
  onDeleteControl: (controlId: string) => Promise<void>;
  onResultRaised?: (control: IsmsAuditControl, result: RaisedResult) => void;
}

const EMPTY_CONTROL: AuditControlFormValues = {
  controlRef: '',
  whatWasTested: '',
  whereToFind: '',
  notes: '',
};

/**
 * The Controls Tested table — the heart of the audit. Fifteen default rows are
 * seeded per audit; the customer/auditor works through each: follow the "Where
 * to find it" reference, verify the evidence, and record a Result (plus an
 * optional note). Rows can be added, edited, or removed freely.
 */
export function AuditControlsTable({
  audit,
  canEdit,
  onCreateControl,
  onUpdateControl,
  onDeleteControl,
  onResultRaised,
}: AuditControlsTableProps) {
  const controls = audit.controls;

  return (
    <Stack gap="3">
      <HStack align="center" gap="2">
        <Heading level="5">Controls Tested</Heading>
        <Badge variant="secondary">{String(controls.length)}</Badge>
      </HStack>
      <Text size="sm" variant="muted">
        For each row: open the &quot;Where to find it&quot; location, verify the content is present
        and appropriate, then record a result. Mark rows deliberately skipped as &quot;Not sampled
        this cycle&quot; — they still render in the document to show the sample was scoped on
        purpose.
      </Text>

      {controls.length === 0 ? (
        <Text size="sm" variant="muted">
          No controls recorded for this audit.
        </Text>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Control reference</TableHead>
                <TableHead>What was tested</TableHead>
                <TableHead>Where to find it</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Notes</TableHead>
                {canEdit ? <TableHead aria-label="Actions" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {controls.map((control) => (
                <AuditControlRow
                  key={control.id}
                  control={control}
                  canEdit={canEdit}
                  onUpdateControl={onUpdateControl}
                  onDeleteControl={onDeleteControl}
                  onResultRaised={onResultRaised}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {canEdit ? (
        <IsmsAddCard addLabel="Add control row" formTitle="New control row">
          {({ close }) => <AddControlForm onAdd={onCreateControl} onClose={close} />}
        </IsmsAddCard>
      ) : null}
    </Stack>
  );
}

function AddControlForm({
  onAdd,
  onClose,
}: {
  onAdd: (values: AuditControlFormValues) => Promise<void>;
  onClose: () => void;
}) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<AuditControlFormValues>({
    resolver: zodResolver(auditControlSchema),
    defaultValues: EMPTY_CONTROL,
  });

  const handleAdd = handleSubmit(async (values) => {
    try {
      await onAdd(values);
    } catch {
      // Keep the user's input and the form open when the save fails.
      return;
    }
    reset(EMPTY_CONTROL);
    onClose();
  });

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-3">
      <IsmsFieldLabel label="Control reference">
        <Field>
          <Controller
            control={control}
            name="controlRef"
            render={({ field: { ref: _ref, ...field }, fieldState }) => (
              <>
                <Input
                  {...field}
                  aria-label="Control reference"
                  placeholder="e.g. A.8.16 Monitoring activities"
                />
                <FieldError>{fieldState.error?.message}</FieldError>
              </>
            )}
          />
        </Field>
      </IsmsFieldLabel>
      <IsmsFieldLabel label="What was tested">
        <Controller
          control={control}
          name="whatWasTested"
          render={({ field: { ref: _ref, ...field } }) => (
            <Input {...field} aria-label="What was tested" />
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
      <HStack justify="end">
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          loading={isSubmitting}
          disabled={isSubmitting}
          iconLeft={<Add size={16} />}
        >
          Add control row
        </Button>
      </HStack>
    </form>
  );
}
