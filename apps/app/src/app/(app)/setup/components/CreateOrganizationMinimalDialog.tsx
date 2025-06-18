import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@comp/ui/dialog';
import { Loader2 } from 'lucide-react';

interface CreateOrganizationMinimalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onConfirmSkip: () => void;
}

export function CreateOrganizationMinimalDialog({
  open,
  onOpenChange,
  loading,
  onConfirmSkip,
}: CreateOrganizationMinimalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild disabled={loading}>
        <Button variant="ghost" className="text-muted-foreground">
          Skip Onboarding
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            If you skip the onboarding process, we won't be able to create custom policies,
            automatically add vendors and risks to the Comp AI platform. You will have to manually
            add them later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirmSkip} disabled={loading}>
            <div className="flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </div>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
