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
import type { Control } from '@db';
import { X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { unmapPolicyFromControl } from '../actions/unmapPolicyFromControl';

export const PolicyControlMappingConfirmDeleteModal = ({ control }: { control: Control }) => {
  const { policyId } = useParams<{ policyId: string }>();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUnmap = async () => {
    console.log('Unmapping control', control.id, 'from policy', policyId);
    try {
      setLoading(true);
      await unmapPolicyFromControl({
        policyId,
        controlId: control.id,
      });
      toast.success(`Control: ${control.name} unmapped successfully from policy ${policyId}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to unlink control');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <X className="ml-2 h-3 w-3 cursor-pointer" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Unlink</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to unlink{' '}
          <span className="text-foreground font-semibold">{control.name}</span> from this policy?{' '}
          {'\n'} You can link it back again later.
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUnmap} disabled={loading}>
            Unmap
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
