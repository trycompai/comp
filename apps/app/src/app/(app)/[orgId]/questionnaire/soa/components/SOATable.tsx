'use client';

import { Card } from '@comp/ui';
import { Button } from '@comp/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { SOATableRow } from './SOATableRow';

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

interface SOATableProps {
  columns: SOAColumn[];
  questions: SOAQuestion[];
  answersMap: Map<string, { answer: string | null; answerVersion: number }>;
  questionStatuses: Map<string, string>;
  processedResults: Map<string, ProcessedResult>;
  isFullyRemote: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  documentId: string;
  isPendingApproval: boolean;
  organizationId: string;
  onAnswerUpdate?: (questionId: string, answer: string | null) => void;
}

const columnLabelMap: Record<string, string> = {
  title: 'Control',
  control_objective: 'Control Objective',
  isApplicable: 'Applicable',
  justification: 'Justification',
};

export function SOATable({
  columns,
  questions,
  answersMap,
  questionStatuses,
  processedResults,
  isFullyRemote,
  isExpanded,
  onToggleExpand,
  documentId,
  isPendingApproval,
  organizationId,
  onAnswerUpdate,
}: SOATableProps) {
  const displayedQuestions = isExpanded ? questions : questions.slice(0, 5);
  const hasMoreQuestions = questions.length > 5;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 table-fixed">
          <colgroup>
            {columns.map((column) => {
              const getColumnWidth = (colName: string) => {
                if (colName === 'isApplicable') {
                  return '15%';
                }
                if (colName === 'title') {
                  return '20%';
                }
                if (colName === 'control_objective') {
                  return '35%';
                }
                if (colName === 'justification') {
                  return '30%';
                }
                return '20%';
              };

              return (
                <col key={column.name} style={{ width: getColumnWidth(column.name) }} />
              );
            })}
          </colgroup>
          <thead>
            <tr className="border-b bg-muted/30">
              {columns.map((column, index) => {
                return (
                  <th
                    key={column.name}
                    className={`py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
                      index === 0 ? 'pl-6 pr-6' : index === columns.length - 1 ? 'px-6 pr-6' : 'px-6'
                    }`}
                  >
                    {columnLabelMap[column.name] ?? column.name.replace(/_/g, ' ')}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayedQuestions.map((question) => {
              const answerData = answersMap.get(question.id);
              const questionStatus = questionStatuses.get(question.id);
              const processedResult = processedResults.get(question.id);
              
              return (
                <SOATableRow
                  key={question.id}
                  question={question}
                  columns={columns}
                  answerData={answerData}
                  questionStatus={questionStatus}
                  processedResult={processedResult}
                  isFullyRemote={isFullyRemote}
                  documentId={documentId}
                  isPendingApproval={isPendingApproval}
                  organizationId={organizationId}
                  onUpdate={(savedAnswer) => {
                    // Update the answer in the parent's answersMap optimistically
                    if (onAnswerUpdate) {
                      onAnswerUpdate(question.id, savedAnswer);
                    }
                  }}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      {hasMoreQuestions && (
        <div className="border-t p-4 flex items-center justify-center">
          <Button
            variant="ghost"
            onClick={onToggleExpand}
            className="gap-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                Show All ({questions.length} total)
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}

