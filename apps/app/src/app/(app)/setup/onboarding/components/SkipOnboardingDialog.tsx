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

interface SkipOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmSkip: () => void;
  isSkipping: boolean;
  triggerDisabled: boolean;
}

export function SkipOnboardingDialog({
  open,
  onOpenChange,
  onConfirmSkip,
  isSkipping,
  triggerDisabled,
}: SkipOnboardingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild disabled={triggerDisabled}>
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
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSkipping}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirmSkip} disabled={isSkipping}>
            <div className="flex items-center gap-2">
              {isSkipping && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </div>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
