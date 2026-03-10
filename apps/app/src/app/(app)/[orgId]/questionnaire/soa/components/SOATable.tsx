'use client';

import { Card } from '@comp/ui';
import { Button } from '@trycompai/design-system';
import { ChevronUp, ChevronDown } from '@trycompai/design-system/icons';
import { SOATableRow } from './SOATableRow';
import { SOAMobileRow } from './SOAMobileRow';

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

  const sharedRowProps = (question: SOAQuestion) => ({
    question,
    columns,
    answerData: answersMap.get(question.id),
    questionStatus: questionStatuses.get(question.id),
    processedResult: processedResults.get(question.id),
    isFullyRemote,
    documentId,
    isPendingApproval,
    organizationId,
    onUpdate: (savedAnswer: string | null) => onAnswerUpdate?.(question.id, savedAnswer),
  });

  return (
    <Card className="overflow-hidden">
      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-separate border-spacing-0" style={{ minWidth: '800px' }}>
          <colgroup>
            {columns.map((column) => (
              <col key={column.name} style={{ width: getColumnWidth(column.name) }} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b bg-muted/30">
              {columns.map((column, index) => (
                <th
                  key={column.name}
                  className={`py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
                    index === 0 ? 'pl-6 pr-6' : index === columns.length - 1 ? 'px-6 pr-6' : 'px-6'
                  }`}
                >
                  {columnLabelMap[column.name] ?? column.name.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedQuestions.map((question) => (
              <SOATableRow key={question.id} {...sharedRowProps(question)} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="lg:hidden divide-y divide-border">
        {displayedQuestions.map((question) => (
          <SOAMobileRow key={question.id} {...sharedRowProps(question)} />
        ))}
      </div>

      {hasMoreQuestions && (
        <div className="border-t p-4 flex items-center justify-center">
          <Button
            variant="ghost"
            onClick={onToggleExpand}
            iconLeft={isExpanded ? <ChevronUp /> : undefined}
            iconRight={!isExpanded ? <ChevronDown /> : undefined}
          >
            {isExpanded ? 'Show Less' : `Show All (${questions.length} total)`}
          </Button>
        </div>
      )}
    </Card>
  );
}

function getColumnWidth(colName: string): string {
  switch (colName) {
    case 'isApplicable': return '15%';
    case 'title': return '20%';
    case 'control_objective': return '35%';
    case 'justification': return '30%';
    default: return '20%';
  }
}
