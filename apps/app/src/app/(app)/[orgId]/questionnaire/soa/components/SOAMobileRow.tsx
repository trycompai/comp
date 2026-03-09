'use client';

import { Loader2 } from 'lucide-react';
import { EditableSOAFields } from './EditableSOAFields';

type SOAColumn = {
  name: string;
  type: 'string' | 'boolean' | 'text';
};

type SOAQuestion = {
  id: string;
  text: string;
  columnMapping: {
    closure: string;
    title: string;
    control_objective: string | null;
    isApplicable: boolean | null;
    justification?: string | null;
  };
};

type ProcessedResult = {
  success: boolean;
  isApplicable: boolean | null;
  justification?: string | null;
  insufficientData?: boolean;
};

interface SOAMobileRowProps {
  question: SOAQuestion;
  columns: SOAColumn[];
  answerData?: { answer: string | null; answerVersion: number };
  questionStatus?: string;
  processedResult?: ProcessedResult;
  isFullyRemote: boolean;
  documentId: string;
  isPendingApproval: boolean;
  organizationId: string;
  onUpdate?: (savedAnswer: string | null) => void;
}

export function SOAMobileRow({
  question,
  answerData,
  questionStatus,
  processedResult,
  isFullyRemote,
  documentId,
  isPendingApproval,
  organizationId,
  onUpdate,
}: SOAMobileRowProps) {
  const isProcessing = questionStatus === 'processing';
  const controlClosure = question.columnMapping.closure || '';
  const isControl7 = controlClosure.startsWith('7.');

  let displayIsApplicable: boolean;
  let justificationValue: string | null;

  if (isFullyRemote && isControl7) {
    displayIsApplicable = false;
    justificationValue = processedResult?.justification
      || answerData?.answer
      || question.columnMapping.justification
      || 'This control is not applicable as our organization operates fully remotely.';
  } else {
    displayIsApplicable = processedResult?.isApplicable !== null && processedResult?.isApplicable !== undefined
      ? processedResult.isApplicable
      : (question.columnMapping.isApplicable ?? true);

    justificationValue = displayIsApplicable === false
      ? (processedResult?.justification || answerData?.answer || question.columnMapping.justification || null)
      : null;
  }

  return (
    <div className="p-4 space-y-3">
      {/* Control title */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Control</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{question.columnMapping.title}</p>
      </div>

      {/* Control objective */}
      {question.columnMapping.control_objective && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Control Objective</p>
          <p className="text-sm text-foreground mt-0.5 leading-relaxed">{question.columnMapping.control_objective}</p>
        </div>
      )}

      {/* Applicable */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Applicable</p>
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Processing...</span>
          </div>
        ) : (
          <EditableSOAFields
            documentId={documentId}
            questionId={question.id}
            isApplicable={displayIsApplicable}
            justification={justificationValue}
            isPendingApproval={isPendingApproval}
            isControl7={isControl7}
            isFullyRemote={isFullyRemote}
            organizationId={organizationId}
            onUpdate={onUpdate}
          />
        )}
      </div>

      {/* Justification (only when not applicable) */}
      {displayIsApplicable === false && !isProcessing && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Justification</p>
          <p className="text-sm text-foreground mt-0.5 leading-relaxed whitespace-pre-wrap">
            {justificationValue || '—'}
          </p>
        </div>
      )}
    </div>
  );
}
