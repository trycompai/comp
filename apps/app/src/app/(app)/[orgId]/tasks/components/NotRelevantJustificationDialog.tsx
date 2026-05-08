'use client';

import { Label, Textarea } from '@trycompai/design-system';
import { Button } from '@trycompai/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import { useState } from 'react';

interface NotRelevantJustificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (justification: string) => void;
  taskCount?: number;
}

export function NotRelevantJustificationDialog({
  open,
  onOpenChange,
  onConfirm,
  taskCount = 1,
}: NotRelevantJustificationDialogProps) {
  const [justification, setJustification] = useState('');

  const isSingular = taskCount === 1;
  const taskLabel = isSingular ? 'this evidence task' : `these ${taskCount} evidence tasks`;

  const handleConfirm = () => {
    onConfirm(justification.trim());
    setJustification('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setJustification('');
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Not Relevant</DialogTitle>
          <DialogDescription>
            Please provide a reason for marking {taskLabel} as not relevant.
            Auditors may review this justification during an audit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="justification">Justification</Label>
          <Textarea
            id="justification"
            placeholder="e.g. This control is out of scope for our current compliance program..."
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!justification.trim()}
          >
            Mark as Not Relevant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
