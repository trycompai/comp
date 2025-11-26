'use client';

import { useState } from 'react';
import { Button } from '@comp/ui/button';
import { Textarea } from '@comp/ui/textarea';
import { Check, X, Loader2, Edit2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { saveSOAAnswer } from '../actions/save-soa-answer';
import { toast } from 'sonner';

interface EditableJustificationProps {
  documentId: string;
  questionId: string;
  isApplicable: boolean | null;
  justification: string | null;
  isPendingApproval: boolean;
  isControl7?: boolean;
  isFullyRemote?: boolean;
  onUpdate?: () => void;
}

export function EditableJustification({
  documentId,
  questionId,
  isApplicable,
  justification: initialJustification,
  isPendingApproval,
  isControl7 = false,
  isFullyRemote = false,
  onUpdate,
}: EditableJustificationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [justification, setJustification] = useState<string | null>(initialJustification);
  const [error, setError] = useState<string | null>(null);

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
    onError: ({ error }) => {
      setError(error.serverError || 'Failed to save answer');
      toast.error(error.serverError || 'Failed to save answer');
    },
  });

  // If control 7.* and fully remote, disable editing
  const isDisabled = isPendingApproval || (isControl7 && isFullyRemote);

  const handleSave = async () => {
    // Validate: if NO, justification is required
    if (isApplicable === false && (!justification || justification.trim().length === 0)) {
      setError('Justification is required when Applicable is NO');
      return;
    }

    const answerValue = isApplicable === false ? justification : null;

    await saveAction.execute({
      documentId,
      questionId,
      answer: answerValue,
      isApplicable,
      justification: isApplicable === false ? justification : null,
    });
  };

  const handleCancel = () => {
    setJustification(initialJustification);
    setIsEditing(false);
    setError(null);
  };

  // Only show if isApplicable is NO
  if (isApplicable !== false) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (isDisabled && !isEditing) {
    return (
      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
        {justification || '—'}
      </p>
    );
  }

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words flex-1">
            {justification || '—'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-6 px-2 text-xs"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={justification || ''}
        onChange={(e) => setJustification(e.target.value)}
        placeholder="Enter justification (required)"
        className="min-h-[80px]"
        required
      />
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saveAction.status === 'executing'}
          className="h-7"
        >
          {saveAction.status === 'executing' ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-1 h-3 w-3" />
              Save
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={saveAction.status === 'executing'}
          className="h-7"
        >
          <X className="mr-1 h-3 w-3" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

