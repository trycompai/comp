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
import { useForm } from '@tanstack/react-form';
import { toast } from 'sonner';
import { DurationPicker } from './DurationPicker';
import { ScopesSelect } from './ScopesSelect';

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
      scopes: data?.requestedScopes || [],
      durationDays: data?.requestedDurationDays ?? 30,
    },
    onSubmit: async ({ value }) => {
      await toast.promise(
        approveRequest({
          requestId,
          scopes: value.scopes,
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
        >
          <DialogHeader>
            <DialogTitle>Approve Access Request</DialogTitle>
            <DialogDescription>
              Review and configure access parameters before sending NDA
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Name</div>
                <div>{data.name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Email</div>
                <div>{data.email}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Company</div>
                <div>{data.company || '-'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Job Title</div>
                <div>{data.jobTitle || '-'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Purpose</div>
                <div>{data.purpose || '-'}</div>
              </div>
            </div>
            <div className="space-y-4">
              <form.Field
                name="scopes"
                validators={{
                  onChange: ({ value }) =>
                    value.length === 0 ? 'Select at least 1 scope' : undefined,
                }}
              >
                {(field) => (
                  <div>
                    <div className="text-sm font-medium mb-2">Access Scopes</div>
                    <ScopesSelect
                      value={field.state.value}
                      onChange={(v) => {
                        field.handleChange(v);
                        field.validate('change');
                      }}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive mt-1">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </form.Field>
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
                {(field) => (
                  <div>
                    <div className="text-sm font-medium mb-2">Duration</div>
                    <DurationPicker value={field.state.value} onChange={field.handleChange} />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive mt-1">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>
          </div>
          <DialogFooter>
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
