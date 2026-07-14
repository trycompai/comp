'use client';

import { Loader2 } from 'lucide-react';
import type {
  SOAFieldSavePayload,
  SOAProcessedResult,
  SOATableAnswerData,
} from './EditableSOAFields';
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

interface SOATableRowProps {
  question: SOAQuestion;
  columns: SOAColumn[];
  answerData?: SOATableAnswerData;
  questionStatus?: string;
  processedResult?: SOAProcessedResult;
  isFullyRemote: boolean;
  documentId: string;
  isPendingApproval: boolean;
  organizationId: string;
  onUpdate?: (payload: SOAFieldSavePayload) => void;
}

export function SOATableRow({
  question,
  columns,
  answerData,
  questionStatus,
  processedResult,
  isFullyRemote,
  documentId,
  isPendingApproval,
  organizationId,
  onUpdate,
}: SOATableRowProps) {
  const isProcessing = questionStatus === 'processing';
  const isInsufficientData = questionStatus === 'insufficient_data' as any;
  const hasInsufficientData = processedResult && 'insufficientData' in processedResult && processedResult.insufficientData === true;
  
  // For controls with closure starting with "7." and fully remote org, always show NO
  const controlClosure = question.columnMapping.closure || '';
  const isControl7 = controlClosure.startsWith('7.');
  
  // Applicability + justification are per-organization values (from this
  // document's own answers or an in-session autofill result), never from the
  // shared framework configuration.
  const { displayIsApplicable, justificationValue } = resolveSoaDisplay({
    answerData,
    processedResult,
    isFullyRemote,
    isControl7,
  });

  return (
    <tr className="border-b transition-colors hover:bg-muted/30 last:border-b-0">
      {columns.map((column, colIndex) => {
        const columnKey = column.name as keyof typeof question.columnMapping;
        let value = question.columnMapping[columnKey];
        
        // For isApplicable column, use displayIsApplicable
        if (column.name === 'isApplicable') {
          value = displayIsApplicable;
        }
        
        // For justification column, use justificationValue
        if (column.name === 'justification') {
          value = justificationValue;
        }
        
        // Show spinner for isApplicable and justification columns if processing
        const showSpinner = (column.name === 'isApplicable' || column.name === 'justification') && isProcessing;
        
        return (
          <td
            key={column.name}
            className={`py-4 text-sm ${
              colIndex === 0 ? 'pl-6 pr-6' : colIndex === columns.length - 1 ? 'px-6 pr-6' : 'px-6'
            } ${column.name === 'isApplicable' ? 'bg-muted/10 text-center' : ''}`}
          >
            {showSpinner ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Processing...</span>
              </div>
            ) : column.name === 'isApplicable' ? (
              isProcessing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
              )
            ) : column.name === 'justification' ? (
              // Show justification text for both Applicable and Not Applicable rows so ISO 27001's
              // requirement of a justification for every control on the SoA is visible in the UI.
              isProcessing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Processing...</span>
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                  {justificationValue || '—'}
                </p>
              )
            ) : (
              // For other columns (title, control_objective), show "Insufficient data" if question has insufficient data
              (isInsufficientData || hasInsufficientData) && column.name !== 'title' && column.name !== 'control_objective' ? (
                <span className="text-xs text-muted-foreground italic">Insufficient data</span>
              ) : (
                <span className={`leading-relaxed whitespace-pre-wrap ${
                  value ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {value || '—'}
                </span>
              )
            )}
          </td>
        );
      })}
    </tr>
  );
}

