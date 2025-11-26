'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@comp/ui/button';
import { Textarea } from '@comp/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@comp/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { X, Loader2, Edit2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { saveSOAAnswer } from '../actions/save-soa-answer';
import { toast } from 'sonner';

interface EditableSOAFieldsProps {
  documentId: string;
  questionId: string;
  isApplicable: boolean | null;
  justification: string | null;
  isPendingApproval: boolean;
  isControl7?: boolean;
  isFullyRemote?: boolean;
  onUpdate?: () => void;
}

export function EditableSOAFields({
  documentId,
  questionId,
  isApplicable: initialIsApplicable,
  justification: initialJustification,
  isPendingApproval,
  isControl7 = false,
  isFullyRemote = false,
  onUpdate,
}: EditableSOAFieldsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isApplicable, setIsApplicable] = useState<boolean | null>(initialIsApplicable);
  const [justification, setJustification] = useState<string | null>(initialJustification);
  const [error, setError] = useState<string | null>(null);
  const justificationTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isJustificationDialogOpen, setJustificationDialogOpen] = useState(false);
  const dialogSavedRef = useRef(false);
  const badgeBaseClasses =
    'inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide w-[3rem]';
  const badgeClasses =
    isApplicable === true
      ? `${badgeBaseClasses} bg-primary text-primary-foreground border-primary/70 shadow-sm shadow-primary/40`
      : isApplicable === false
        ? `${badgeBaseClasses} bg-destructive text-destructive-foreground border-destructive/70 shadow-sm shadow-destructive/40`
        : `${badgeBaseClasses} bg-muted text-muted-foreground border-transparent`;

  const saveAction = useAction(saveSOAAnswer, {
    onSuccess: () => {
      setIsEditing(false);
      setError(null);
      toast.success('Answer saved successfully');
      // Refresh page to update configuration
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      onUpdate?.();
    },
    onError: () => {
      const message = 'Failed to save answer';
      if (!isJustificationDialogOpen) {
        setIsApplicable(initialIsApplicable);
        setJustification(initialJustification);
        setJustificationDialogOpen(false);
      }
      setError(message);
      toast.error(message);
    },
  });

  useEffect(() => {
    setIsApplicable(initialIsApplicable);
    setJustification(initialJustification);
  }, [initialIsApplicable, initialJustification]);

  // If control 7.* and fully remote, disable editing
  const isDisabled = isPendingApproval || (isControl7 && isFullyRemote);

  // Auto-focus justification field when dialog opens
  useEffect(() => {
    if (isJustificationDialogOpen && justificationTextareaRef.current) {
      setTimeout(() => {
        justificationTextareaRef.current?.focus();
      }, 75);
    }
  }, [isJustificationDialogOpen]);

  const executeSave = (
    nextIsApplicable: boolean | null,
    nextJustification: string | null,
  ) => {
    const answerValue = nextIsApplicable === false ? nextJustification : null;
    return saveAction.execute({
      documentId,
      questionId,
      answer: answerValue,
      isApplicable: nextIsApplicable,
      justification: nextIsApplicable === false ? nextJustification : null,
    });
  };

  const closeEditing = () => {
    setIsEditing(false);
    setIsApplicable(initialIsApplicable);
    setJustification(initialJustification);
    setError(null);
    setJustificationDialogOpen(false);
  };

  const handleEditClick = () => {
    setIsEditing(true);
    if (isApplicable === false) {
      setJustificationDialogOpen(true);
    } else {
      setJustificationDialogOpen(false);
    }
  };

  const handleSelectChange = (value: 'yes' | 'no' | 'null') => {
    const newValue = value === 'yes' ? true : value === 'no' ? false : null;
    setIsApplicable(newValue);
    setError(null);

    if (newValue === true) {
      setJustification(null);
      setJustificationDialogOpen(false);
      void executeSave(true, null);
      return;
    }

    if (newValue === false) {
      setJustificationDialogOpen(true);
      return;
    }

    setJustificationDialogOpen(false);
    void executeSave(null, null);
  };

  const handleJustificationSave = async () => {
    if (!justification || justification.trim().length === 0) {
      setError('Justification is required when Applicable is NO');
      justificationTextareaRef.current?.focus();
      return;
    }

    await executeSave(false, justification);
    dialogSavedRef.current = true;
    setJustificationDialogOpen(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (dialogSavedRef.current) {
        dialogSavedRef.current = false;
      } else {
        setIsApplicable(initialIsApplicable);
        setJustification(initialJustification);
      }
      setError(null);
    }

    setJustificationDialogOpen(open);
  };

  if (isDisabled && !isEditing) {
    // Display mode
    return (
      <div className="flex w-full flex-col items-center gap-2 text-center">
        <span className={`${badgeClasses} uppercase`}>
          {isApplicable === true ? 'YES' : isApplicable === false ? 'NO' : '—'}
        </span>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="group relative flex w-full items-center justify-center">
        <span className={`${badgeClasses} uppercase`}>
          {isApplicable === true ? 'YES' : isApplicable === false ? 'NO' : '—'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleEditClick}
          className="absolute right-0 h-6 w-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
          aria-label="Edit answer"
        >
          <Edit2 className="h-3 w-3" />
          <span className="sr-only">Edit answer</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Select
          value={isApplicable === null ? 'null' : isApplicable ? 'yes' : 'no'}
          onValueChange={handleSelectChange}
        >
          <SelectTrigger className="w-32" disabled={saveAction.status === 'executing'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="null" disabled>
              —
            </SelectItem>
            <SelectItem value="yes">YES</SelectItem>
            <SelectItem value="no">NO</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          onClick={closeEditing}
          disabled={saveAction.status === 'executing'}
          aria-label="Close editing"
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Close editing</span>
        </Button>
      </div>

      <Dialog open={isJustificationDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justification Required</DialogTitle>
            <DialogDescription>
              Explain why this control is not applicable to your organization.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            ref={justificationTextareaRef}
            value={justification || ''}
            onChange={(e) => {
              setJustification(e.target.value);
              setError(null);
            }}
            placeholder="Enter justification (required)"
            className="min-h-[120px]"
            required
          />
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => handleDialogOpenChange(false)}
              disabled={saveAction.status === 'executing'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleJustificationSave}
              disabled={saveAction.status === 'executing'}
            >
              {saveAction.status === 'executing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save justification'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

