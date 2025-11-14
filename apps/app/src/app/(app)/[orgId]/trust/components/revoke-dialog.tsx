import { useRevokeAccessGrant } from '@/hooks/use-access-requests';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Field, FieldError, FieldLabel } from '@comp/ui/field';
import { Textarea } from '@comp/ui/textarea';
import { useForm } from '@tanstack/react-form';
import { toast } from 'sonner';
import * as z from 'zod';

const revokeSchema = z.object({
  reason: z.string().min(1, { message: 'Reason is required' }),
});

export function RevokeDialog({
  orgId,
  grantId,
  onClose,
}: {
  orgId: string;
  grantId: string;
  onClose: () => void;
}) {
  const { mutateAsync: revokeGrant } = useRevokeAccessGrant(orgId);

  const form = useForm({
    defaultValues: {
      reason: '',
    },
    validators: {
      onChange: revokeSchema,
    },
    onSubmit: async ({ value }) => {
      await toast.promise(revokeGrant({ grantId, reason: value.reason }), {
        loading: 'Revoking...',
        success: () => {
          onClose();
          return 'Grant revoked';
        },
        error: 'Failed to revoke grant',
      });
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex flex-col gap-1"
        >
          <DialogHeader>
            <DialogTitle>Revoke Access Grant</DialogTitle>
            <DialogDescription>Please provide a reason for revoking this grant</DialogDescription>
          </DialogHeader>
          <form.Field name="reason">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor="reason">Reason</FieldLabel>
                  <Textarea
                    id="reason"
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={isInvalid}
                    placeholder="Reason for revocation..."
                    rows={4}
                    className="resize-none"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
          <DialogFooter className="gap-1">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button variant="destructive" type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? 'Revoking...' : 'Revoke Grant'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
