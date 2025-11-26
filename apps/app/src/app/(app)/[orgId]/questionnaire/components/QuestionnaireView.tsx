'use client';

import { QuestionnaireResults } from './QuestionnaireResults';
import { QuestionnaireSidebar } from './QuestionnaireSidebar';
import { QuestionnaireUpload } from './QuestionnaireUpload';

interface QuestionnaireViewProps {
  // Common props
  orgId: string;
  results: Array<{
    question: string;
    answer: string | null;
    sources: any;
    failedToGenerate?: boolean;
    status?: 'untouched' | 'generated' | 'manual';
    _originalIndex?: number;
  }> | null;
  filteredResults: Array<{
    question: string;
    answer: string | null;
    sources: any;
    failedToGenerate?: boolean;
    status?: 'untouched' | 'generated' | 'manual';
    _originalIndex?: number;
  }> | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  editingIndex: number | null;
  editingAnswer: string;
  setEditingAnswer: (answer: string) => void;
  expandedSources: Set<number>;
  questionStatuses: Map<number, 'pending' | 'processing' | 'completed'>;
  answeringQuestionIndex: number | null;
  answerQueue?: number[];
  hasClickedAutoAnswer: boolean;
  isLoading: boolean;
  isAutoAnswering: boolean;
  isExporting: boolean;
  isSaving?: boolean;
  savingIndex?: number | null;
  totalCount: number;
  answeredCount: number;
  progressPercentage: number;
  onAutoAnswer: () => void;
  onAnswerSingleQuestion: (index: number) => void;
  onEditAnswer: (index: number) => void;
  onSaveAnswer: (index: number) => void;
  onCancelEdit: () => void;
  onExport: (format: 'xlsx' | 'csv' | 'pdf') => void;
  onToggleSource: (index: number) => void;
  
  // New questionnaire specific props (optional)
  selectedFile?: File | null;
  onFileSelect?: (acceptedFiles: File[], rejectedFiles: any[]) => void;
  onFileRemove?: () => void;
  onParse?: () => void;
  parseStatus?: 'uploading' | 'starting' | 'queued' | 'analyzing' | 'processing' | null;
  showExitDialog?: boolean;
  onShowExitDialogChange?: (show: boolean) => void;
  onExit?: () => void;
  
  // Existing questionnaire specific props (optional)
  filename?: string;
  description?: string;
}

export function QuestionnaireView({
  orgId,
  results,
  filteredResults,
  searchQuery,
  setSearchQuery,
  editingIndex,
  editingAnswer,
  setEditingAnswer,
  expandedSources,
  questionStatuses,
  answeringQuestionIndex,
  answerQueue = [],
  hasClickedAutoAnswer,
  isLoading,
  isAutoAnswering,
  isExporting,
  isSaving,
  savingIndex,
  totalCount,
  answeredCount,
  progressPercentage,
  onAutoAnswer,
  onAnswerSingleQuestion,
  onEditAnswer,
  onSaveAnswer,
  onCancelEdit,
  onExport,
  onToggleSource,
  // New questionnaire props
  selectedFile,
  onFileSelect,
  onFileRemove,
  onParse,
  parseStatus,
  showExitDialog = false,
  onShowExitDialogChange,
  onExit,
  // Existing questionnaire props
  filename,
  description,
}: QuestionnaireViewProps) {
  const hasResults = results && results.length > 0;
  const isNewQuestionnaire = selectedFile !== undefined && onFileSelect !== undefined;

  // Show upload UI only for new questionnaire when there are no results
  if (isNewQuestionnaire && !hasResults) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 lg:gap-3">
          <h1 className="text-xl lg:text-2xl font-semibold text-foreground">
            Security Questionnaire
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Automatically analyze and answer questionnaires using AI. Upload questionnaires from
            vendors, and our system will extract questions and generate answers based on your
            organization's policies and documentation.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          <div className="lg:col-span-2">
            <QuestionnaireUpload
              selectedFile={selectedFile ?? null}
              onFileSelect={onFileSelect!}
              onFileRemove={onFileRemove ?? (() => {})}
              onParse={onParse ?? (() => {})}
              isLoading={isLoading}
              parseStatus={parseStatus ?? null}
              orgId={orgId}
            />
          </div>
          <div className="lg:col-span-1">
            <QuestionnaireSidebar />
          </div>
        </div>
      </div>
    );
  }

  // Show results (for both new and existing questionnaires)
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl lg:text-2xl font-semibold text-foreground">
          {filename || 'Security Questionnaire'}
        </h1>
        <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed max-w-3xl">
          {description ||
            "Review and manage answers for this questionnaire"}
        </p>
      </div>
      <QuestionnaireResults
        orgId={orgId}
        results={results ?? []}
        filteredResults={filteredResults}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        editingIndex={editingIndex}
        editingAnswer={editingAnswer}
        onEditingAnswerChange={setEditingAnswer}
        expandedSources={expandedSources}
        questionStatuses={questionStatuses as Map<number, 'pending' | 'processing' | 'completed'>}
        answeringQuestionIndex={answeringQuestionIndex}
        answerQueue={answerQueue}
        hasClickedAutoAnswer={hasClickedAutoAnswer}
        isLoading={isLoading}
        isAutoAnswering={isAutoAnswering}
        isExporting={isExporting}
        isSaving={isSaving}
        savingIndex={savingIndex}
        showExitDialog={showExitDialog}
        onShowExitDialogChange={onShowExitDialogChange ?? (() => {})}
        onExit={onExit ?? (() => {})}
        onAutoAnswer={onAutoAnswer}
        onAnswerSingleQuestion={onAnswerSingleQuestion}
        onEditAnswer={onEditAnswer}
        onSaveAnswer={onSaveAnswer}
        onCancelEdit={onCancelEdit}
        onExport={onExport}
        onToggleSource={onToggleSource}
        totalCount={totalCount}
        answeredCount={answeredCount}
        progressPercentage={progressPercentage}
      />
    </div>
  );
}

