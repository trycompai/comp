'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@trycompai/design-system';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { RecordAcceptanceInput } from '@/hooks/use-risk-acceptances';

const acceptanceSchema = z.object({
  acceptedById: z.string().min(1, 'Choose who is accepting this risk'),
  notes: z.string().max(2000).optional(),
});

type AcceptanceFormValues = z.infer<typeof acceptanceSchema>;

export interface AcceptorOption {
  id: string;
  name: string;
}

interface RecordAcceptanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "risk" or "vendor risk" — used in the confirmation sentence. */
  subjectLabel: string;
  /** Current residual level label ("Low") the acceptor confirms. */
  residualLevelLabel: string;
  /** Active members who can be named as acceptor. */
  acceptorOptions: AcceptorOption[];
  /** Default acceptor: the owner (assignee) when set. */
  defaultAcceptorId: string | null;
  onRecord: (input: RecordAcceptanceInput) => Promise<void>;
}

/**
 * The 6.1.3(f) acceptance modal: names the acceptor (defaults to the owner,
 * changeable), captures optional notes, and states exactly what is being
 * confirmed. The resulting event is timestamped and immutable — the dialog
 * says so, because there is no edit/delete afterwards.
 */
export function RecordAcceptanceDialog({
  open,
  onOpenChange,
  subjectLabel,
  residualLevelLabel,
  acceptorOptions,
  defaultAcceptorId,
  onRecord,
}: RecordAcceptanceDialogProps) {
  // Only preselect the owner when they are actually selectable (active) —
  // a deactivated owner would otherwise be silently submitted and rejected
  // by the API. With no valid default the user must pick a member.
  const validDefaultId = acceptorOptions.some(
    (option) => option.id === defaultAcceptorId,
  )
    ? (defaultAcceptorId ?? '')
    : '';
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<AcceptanceFormValues>({
    resolver: zodResolver(acceptanceSchema),
    defaultValues: { acceptedById: validDefaultId, notes: '' },
  });

  const acceptorId = watch('acceptedById');
  const acceptorName =
    acceptorOptions.find((option) => option.id === acceptorId)?.name ?? 'the selected member';

  const handleClose = (next: boolean) => {
    if (!next) reset({ acceptedById: validDefaultId, notes: '' });
    onOpenChange(next);
  };

  const handleRecord = handleSubmit(async (values) => {
    await onRecord({
      acceptedById: values.acceptedById,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
    });
    handleClose(false);
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record risk-owner acceptance</DialogTitle>
          <DialogDescription>
            By recording acceptance, {acceptorName} confirms they have reviewed the treatment of
            this {subjectLabel} and accept the residual risk level of {residualLevelLabel}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleRecord} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="acceptance-acceptor">Accepted by</Label>
            <Controller
              control={control}
              name="acceptedById"
              render={({ field }) => (
                <Select
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? '')}
                >
                  <SelectTrigger id="acceptance-acceptor" aria-label="Accepted by">
                    <SelectValue placeholder="Choose a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {acceptorOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.acceptedById && (
              <span role="alert" className="text-xs text-destructive">
                {errors.acceptedById.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="acceptance-notes">Notes (optional)</Label>
            <Controller
              control={control}
              name="notes"
              render={({ field: { ref: _ref, ...field } }) => (
                <Textarea
                  {...field}
                  id="acceptance-notes"
                  rows={3}
                  placeholder="e.g. Reviewed at the Q2 risk review"
                  aria-label="Acceptance notes"
                />
              )}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            The acceptance is timestamped and cannot be edited or deleted. If the residual level
            changes later, it is marked stale and a new acceptance must be recorded; earlier
            acceptances stay in the history.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record acceptance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
