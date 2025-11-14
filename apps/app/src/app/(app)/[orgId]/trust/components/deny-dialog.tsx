import { useDenyAccessRequest } from '@/hooks/use-access-requests';
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

const denySchema = z.object({
  reason: z.string().min(1, { message: 'Reason is required' }),
});

export function DenyDialog({
  orgId,
  requestId,
  onClose,
}: {
  orgId: string;
  requestId: string;
  onClose: () => void;
}) {
  const { mutateAsync: denyRequest } = useDenyAccessRequest(orgId);

  const form = useForm({
    defaultValues: {
      reason: '',
    },
    validators: {
      onChange: denySchema,
    },
    onSubmit: async ({ value }) => {
      toast.promise(denyRequest({ requestId, reason: value.reason }), {
        loading: 'Denying...',
        success: () => {
          onClose();
          return 'Request denied';
        },
        error: 'Failed to deny request',
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
            <DialogTitle>Deny Access Request</DialogTitle>
            <DialogDescription>Please provide a reason for denying this request</DialogDescription>
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
                    placeholder="Reason for denial..."
                    rows={4}
                    className="resize-none"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
          <DialogFooter className="gap-1">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button variant="destructive" type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? 'Denying...' : 'Deny Request'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
