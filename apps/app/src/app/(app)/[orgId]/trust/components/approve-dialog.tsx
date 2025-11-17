import { useAccessRequest, useApproveAccessRequest } from '@/hooks/use-access-requests';
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
import { useForm } from '@tanstack/react-form';
import { toast } from 'sonner';
import { DurationPicker } from './duration-picker';

export function ApproveDialog({
  orgId,
  requestId,
  onClose,
}: {
  orgId: string;
  requestId: string;
  onClose: () => void;
}) {
  const { data } = useAccessRequest(orgId, requestId);
  const { mutateAsync: approveRequest } = useApproveAccessRequest(orgId);

  const form = useForm({
    defaultValues: {
      durationDays: data?.requestedDurationDays ?? 30,
    },
    onSubmit: async ({ value }) => {
      toast.promise(
        approveRequest({
          requestId,
          durationDays: value.durationDays,
        }),
        {
          loading: 'Approving...',
          success: () => {
            onClose();
            return 'Request approved. NDA email sent.';
          },
          error: 'Failed to approve request',
        },
      );
    },
  });

  if (!data) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex flex-col gap-1"
        >
          <DialogHeader>
            <DialogTitle>Approve Access Request</DialogTitle>
            <DialogDescription>
              Review and configure access parameters before sending NDA
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium text-muted-foreground">Name</div>
                <div>{data.name}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium text-muted-foreground">Email</div>
                <div>{data.email}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium text-muted-foreground">Company</div>
                <div>{data.company || '-'}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium text-muted-foreground">Job Title</div>
                <div>{data.jobTitle || '-'}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium text-muted-foreground">Purpose</div>
                <div>{data.purpose || '-'}</div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <form.Field
                name="durationDays"
                validators={{
                  onChange: ({ value }) => {
                    if (value < 7) return 'Minimum 7 days';
                    if (value > 365) return 'Maximum 365 days';
                    return undefined;
                  },
                }}
              >
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="duration">Duration</FieldLabel>
                      <DurationPicker
                        value={field.state.value}
                        onChange={field.handleChange}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.Field>
            </div>
          </div>
          <DialogFooter className="gap-1">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? 'Approving...' : 'Approve & Send NDA'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
