'use client';

import { Loader2 } from 'lucide-react';
import type { SOAFieldSavePayload, SOATableAnswerData } from './EditableSOAFields';
import { EditableSOAFields } from './EditableSOAFields';
import { resolveSoaDisplay } from './soa-display';

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
  answerData?: SOATableAnswerData;
  questionStatus?: string;
  processedResult?: ProcessedResult;
  isFullyRemote: boolean;
  documentId: string;
  isPendingApproval: boolean;
  organizationId: string;
  onUpdate?: (payload: SOAFieldSavePayload) => void;
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

  // Applicability + justification are per-organization values from this
  // document's own answers or an in-session autofill result — never from the
  // shared framework configuration.
  const { displayIsApplicable, justificationValue } = resolveSoaDisplay({
    answerData,
    processedResult,
    isFullyRemote,
    isControl7,
  });

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

      {/* Justification (shown for both Applicable and Not Applicable per ISO 27001) */}
      {!isProcessing && (
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
