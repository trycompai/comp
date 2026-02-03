'use client';

import { useState } from 'react';

import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PolicyImageResetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  policyId: number;
  onRefresh: () => void;
}

export function PolicyImageResetModal({
  open,
  onOpenChange,
  organizationId,
  policyId,
  onRefresh,
}: PolicyImageResetModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      const params = new URLSearchParams({ organizationId, policyId: String(policyId) });
      const res = await fetch(`/api/fleet-policy?${params}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'Failed to remove images');
      }
      onRefresh();
      onOpenChange(false);
      toast.success('Images removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove images');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove all images</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to remove all images?
        </p>
        <DialogFooter>
          <Button
            variant="ghost"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            No
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
