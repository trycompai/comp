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
import { Check, X, Loader2, Edit2 } from 'lucide-react';
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

  // Auto-focus justification field when NO is selected
  useEffect(() => {
    if (isEditing && isApplicable === false && justificationTextareaRef.current) {
      // Small delay to ensure the textarea is rendered
      setTimeout(() => {
        justificationTextareaRef.current?.focus();
      }, 100);
    }
  }, [isEditing, isApplicable]);

  const handleSave = async () => {
    // Validate: if NO, justification is required
    if (isApplicable === false && (!justification || justification.trim().length === 0)) {
      setError('Justification is required when Applicable is NO');
      if (justificationTextareaRef.current) {
        justificationTextareaRef.current.focus();
      }
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
    setIsApplicable(initialIsApplicable);
    setJustification(initialJustification);
    setIsEditing(false);
    setError(null);
  };

  if (isDisabled && !isEditing) {
    // Display mode
    return (
      <div className="flex flex-col gap-2">
        <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold w-fit ${
          isApplicable === true
            ? 'bg-emerald-500 text-white shadow-sm'
            : isApplicable === false
              ? 'bg-rose-500 text-white shadow-sm'
              : 'bg-muted text-muted-foreground'
        }`}>
          {isApplicable === true ? 'YES' : isApplicable === false ? 'NO' : '—'}
        </span>
        {isApplicable === false && justification && (
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
            {justification}
          </p>
        )}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold w-fit ${
          isApplicable === true
            ? 'bg-emerald-500 text-white shadow-sm'
            : isApplicable === false
              ? 'bg-rose-500 text-white shadow-sm'
              : 'bg-muted text-muted-foreground'
        }`}>
          {isApplicable === true ? 'YES' : isApplicable === false ? 'NO' : '—'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="h-6 px-2 text-xs"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Select
          value={isApplicable === null ? 'null' : isApplicable ? 'yes' : 'no'}
          onValueChange={(value) => {
            const newValue = value === 'yes' ? true : value === 'no' ? false : null;
            setIsApplicable(newValue);
            // Clear justification if switching to YES
            if (newValue === true) {
              setJustification(null);
            }
            // Clear error when changing selection
            setError(null);
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">YES</SelectItem>
            <SelectItem value="no">NO</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isApplicable === false && (
        <div className="flex flex-col gap-2">
          <Textarea
            ref={justificationTextareaRef}
            value={justification || ''}
            onChange={(e) => {
              setJustification(e.target.value);
              setError(null); // Clear error when typing
            }}
            placeholder="Enter justification (required)"
            className="min-h-[80px]"
            required
          />
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
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

