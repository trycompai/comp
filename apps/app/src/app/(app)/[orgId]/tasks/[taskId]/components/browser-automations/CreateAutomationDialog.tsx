'use client';

import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { Textarea } from '@comp/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface CreateAutomationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isCreating: boolean;
  onCreate: (data: { name: string; targetUrl: string; instruction: string }) => Promise<boolean>;
}

export function CreateAutomationDialog({
  isOpen,
  onClose,
  isCreating,
  onCreate,
}: CreateAutomationDialogProps) {
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [instruction, setInstruction] = useState('');

  const handleCreate = async () => {
    const success = await onCreate({ name, targetUrl, instruction });
    if (success) {
      setName('');
      setTargetUrl('');
      setInstruction('');
      onClose();
    }
  };

  const handleClose = () => {
    setName('');
    setTargetUrl('');
    setInstruction('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Browser Automation</DialogTitle>
          <DialogDescription>
            Configure an automation to navigate to a page and capture a screenshot.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., GitHub Branch Protection"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="targetUrl">Starting URL</Label>
            <Input
              id="targetUrl"
              placeholder="https://github.com/owner/repo"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The URL where the automation will start navigating from.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="instruction">Navigation Instruction</Label>
            <Textarea
              id="instruction"
              placeholder="Navigate to Settings, then click on Branches to view branch protection rules"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Describe in natural language where the AI should navigate before taking a screenshot.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name || !targetUrl || !instruction}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Automation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
