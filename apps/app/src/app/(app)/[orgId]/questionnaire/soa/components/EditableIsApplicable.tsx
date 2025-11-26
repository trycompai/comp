'use client';

import { useState } from 'react';
import { Button } from '@comp/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@comp/ui/select';
import { Edit2, Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { saveSOAAnswer } from '../actions/save-soa-answer';
import { toast } from 'sonner';

interface EditableIsApplicableProps {
  documentId: string;
  questionId: string;
  isApplicable: boolean | null;
  isPendingApproval: boolean;
  isControl7?: boolean;
  isFullyRemote?: boolean;
  onUpdate?: () => void;
}

export function EditableIsApplicable({
  documentId,
  questionId,
  isApplicable: initialIsApplicable,
  isPendingApproval,
  isControl7 = false,
  isFullyRemote = false,
  onUpdate,
}: EditableIsApplicableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isApplicable, setIsApplicable] = useState<boolean | null>(initialIsApplicable);

  const saveAction = useAction(saveSOAAnswer, {
    onSuccess: () => {
      setIsEditing(false);
      toast.success('Answer saved successfully');
      // Refresh page to update configuration
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      onUpdate?.();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to save answer');
    },
  });

  // If control 7.* and fully remote, disable editing
  const isDisabled = isPendingApproval || (isControl7 && isFullyRemote);

  const handleSave = async () => {
    await saveAction.execute({
      documentId,
      questionId,
      answer: null, // Answer is stored in justification field when NO
      isApplicable,
      justification: null, // Justification is handled separately in EditableJustification
    });
  };

  const handleCancel = () => {
    setIsApplicable(initialIsApplicable);
    setIsEditing(false);
  };

  if (isDisabled && !isEditing) {
    return (
      <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold ${
        isApplicable === true
          ? 'bg-emerald-500 text-white shadow-sm'
          : isApplicable === false
            ? 'bg-rose-500 text-white shadow-sm'
            : 'bg-muted text-muted-foreground'
      }`}>
        {isApplicable === true ? 'YES' : isApplicable === false ? 'NO' : '—'}
      </span>
    );
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold ${
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
    <div className="flex items-center gap-2">
      <Select
        value={isApplicable === null ? 'null' : isApplicable ? 'yes' : 'no'}
        onValueChange={(value) => {
          setIsApplicable(value === 'yes' ? true : value === 'no' ? false : null);
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
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saveAction.status === 'executing'}
        className="h-7"
      >
        {saveAction.status === 'executing' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          'Save'
        )}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleCancel}
        disabled={saveAction.status === 'executing'}
        className="h-7"
      >
        Cancel
      </Button>
    </div>
  );
}

