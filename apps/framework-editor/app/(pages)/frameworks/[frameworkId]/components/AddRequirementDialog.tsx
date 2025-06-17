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
import { useToast } from '@comp/ui/use-toast';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  addRequirementAction,
  type AddRequirementActionState,
} from '../actions/add-requirement-action';

const initialFormState: AddRequirementActionState = {
  success: false,
  error: undefined,
  issues: undefined,
  data: undefined,
  message: undefined,
};

interface AddRequirementDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  frameworkId: string;
  onRequirementAdded: () => void;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Adding Requirement...' : 'Add Requirement'}
    </Button>
  );
}

export function AddRequirementDialog({
  isOpen,
  onOpenChange,
  frameworkId,
  onRequirementAdded,
}: AddRequirementDialogProps) {
  const { toast } = useToast();
  const [formKey, setFormKey] = useState(Date.now());
  const [formState, formAction, isPending] = useActionState(addRequirementAction, initialFormState);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [identifier, setIdentifier] = useState('');

  useEffect(() => {
    if (formState.success && formState.data) {
      toast({
        title: 'Success!',
        description: formState.message || 'New requirement added successfully.',
      });
      onRequirementAdded(); // Close dialog and refresh list
      setName(''); // Reset local state
      setDescription('');
      setIdentifier('');
      // The form itself will reset due to the key change on next open if desired, or if onOpenChange triggers a reset
    } else if (!formState.success && (formState.error || formState.issues)) {
      const issueMessages =
        formState.issues?.map((i) => `${i.path.join('.')} : ${i.message}`).join('; ') || '';
      toast({
        title: 'Error Adding Requirement',
        description: formState.error || issueMessages || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  }, [formState, onRequirementAdded, toast]);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Reset form fields and formState when dialog is opened
      setName('');
      setDescription('');
      setIdentifier('');
      setFormKey(Date.now()); // Reset form state by changing key, ensuring useFormState re-initializes
    } else {
      // If dialog is closed ensure parent knows
      onOpenChange(false);
    }
    // Call onOpenChange to control dialog visibility from parent
    // This might be redundant if the above else already calls it, but ensures consistency.
    // onOpenChange(open);
  };

  // We only want to call onOpenChange from parent when dialog truly intends to close.
  // The Dialog component itself calls its onOpenChange prop for various reasons (escape, click outside).
  // So, we manage our internal logic first, then call parent's onOpenChange when appropriate.

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Requirement</DialogTitle>
          <DialogDescription>
            Fill in the details for the new requirement for this framework.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} key={formKey}>
          {' '}
          {/* Add key here */}
          <input type="hidden" name="frameworkId" value={frameworkId} />
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={`name-${frameworkId}`} className="text-right">
                Name
              </Label>
              <Input
                id={`name-${frameworkId}`}
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
                disabled={isPending}
              />
              {formState.issues?.find((issue) => issue.path.includes('name')) && (
                <p className="text-destructive col-span-4 text-right text-sm">
                  {formState.issues.find((issue) => issue.path.includes('name'))?.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={`identifier-${frameworkId}`} className="text-right">
                Identifier
              </Label>
              <Input
                id={`identifier-${frameworkId}`}
                name="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="col-span-3"
                placeholder="e.g., cc1-1"
                disabled={isPending}
              />
              {formState.issues?.find((issue) => issue.path.includes('identifier')) && (
                <p className="text-destructive col-span-4 text-right text-sm">
                  {formState.issues.find((issue) => issue.path.includes('identifier'))?.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={`description-${frameworkId}`} className="text-right">
                Description
              </Label>
              <Textarea
                id={`description-${frameworkId}`}
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                placeholder="Provide a detailed description of the requirement..."
                rows={4}
                disabled={isPending}
              />
              {formState.issues?.find((issue) => issue.path.includes('description')) && (
                <p className="text-destructive col-span-4 text-right text-sm">
                  {formState.issues.find((issue) => issue.path.includes('description'))?.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
