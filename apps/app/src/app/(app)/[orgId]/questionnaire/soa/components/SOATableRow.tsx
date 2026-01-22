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

interface SOATableRowProps {
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
  
  // Determine displayIsApplicable and justificationValue based on fully remote logic
  let displayIsApplicable: boolean;
  let justificationValue: string | null;
  
  // If fully remote and control starts with "7.", always show NO (override any other value)
  if (isFullyRemote && isControl7) {
    displayIsApplicable = false;
    justificationValue = processedResult?.justification 
      || answerData?.answer
      || question.columnMapping.justification
      || 'This control is not applicable as our organization operates fully remotely.';
  } else {
    // Normal logic for other controls
    const isApplicableValue = processedResult?.isApplicable !== null && processedResult?.isApplicable !== undefined
      ? processedResult.isApplicable
      : (question.columnMapping.isApplicable ?? true); // Default to YES
    
    // For justification: only show if isApplicable is NO
    justificationValue = (isApplicableValue === false && processedResult?.justification) 
      || (isApplicableValue === false && answerData?.answer)
      || (isApplicableValue === false && question.columnMapping.justification)
      || null;
    
    displayIsApplicable = processedResult?.isApplicable !== null && processedResult?.isApplicable !== undefined
      ? processedResult.isApplicable
      : (question.columnMapping.isApplicable ?? true); // Default to YES
  }

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
              // Justification is handled within EditableSOAFields when isApplicable is NO
              isProcessing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Processing...</span>
                </div>
              ) : displayIsApplicable === false ? (
                // Show justification text in this column when not editing
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                  {justificationValue || '—'}
                </p>
              ) : (
                <span className="text-muted-foreground">—</span>
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

