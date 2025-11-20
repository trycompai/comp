'use client';

import { QuestionnaireResults } from '../../components/QuestionnaireResults';
import { useQuestionnaireDetail } from '../../hooks/useQuestionnaireDetail';

interface QuestionnaireDetailClientProps {
  questionnaireId: string;
  organizationId: string;
  initialQuestions: Array<{
    id: string;
    question: string;
    answer: string | null;
    status: 'untouched' | 'generated' | 'manual';
    questionIndex: number;
    sources: any;
  }>;
  filename: string;
}

export function QuestionnaireDetailClient({
  questionnaireId,
  organizationId,
  initialQuestions,
  filename,
}: QuestionnaireDetailClientProps) {
  const {
    results,
    searchQuery,
    setSearchQuery,
    editingIndex,
    editingAnswer,
    setEditingAnswer,
    expandedSources,
    questionStatuses,
    answeringQuestionIndex,
    hasClickedAutoAnswer,
    isLoading,
    isAutoAnswering,
    isExporting,
    isSaving,
    savingIndex,
    filteredResults,
    answeredCount,
    totalCount,
    progressPercentage,
    handleAutoAnswer,
    handleAnswerSingleQuestion,
    handleEditAnswer,
    handleSaveAnswer,
    handleCancelEdit,
    handleExport,
    handleToggleSource,
  } = useQuestionnaireDetail({
    questionnaireId,
    organizationId,
    initialQuestions,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl lg:text-2xl font-semibold text-foreground">{filename}</h1>
        <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed max-w-3xl">
          Review and manage answers for this questionnaire
        </p>
      </div>
      <QuestionnaireResults
        orgId={organizationId}
        results={results.map((r, index) => ({
          question: r.question,
          answer: r.answer,
          sources: r.sources,
          failedToGenerate: (r as any).failedToGenerate ?? false, // Preserve failedToGenerate from result
          _originalIndex: (r as any).originalIndex ?? index, // Preserve originalIndex for reference, fallback to map index
        }))}
        filteredResults={filteredResults?.map((r, index) => ({
          question: r.question,
          answer: r.answer,
          sources: r.sources,
          failedToGenerate: (r as any).failedToGenerate ?? false, // Preserve failedToGenerate from result
          _originalIndex: (r as any).originalIndex ?? index, // Preserve originalIndex for reference, fallback to map index
        }))}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        editingIndex={editingIndex}
        editingAnswer={editingAnswer}
        onEditingAnswerChange={setEditingAnswer}
        expandedSources={expandedSources}
        questionStatuses={questionStatuses}
        answeringQuestionIndex={answeringQuestionIndex}
        hasClickedAutoAnswer={hasClickedAutoAnswer}
        isLoading={isLoading}
        isAutoAnswering={isAutoAnswering}
        isExporting={isExporting}
        isSaving={isSaving}
        savingIndex={savingIndex}
        showExitDialog={false}
        onShowExitDialogChange={() => {}}
        onExit={() => {}}
        onAutoAnswer={handleAutoAnswer}
        onAnswerSingleQuestion={handleAnswerSingleQuestion}
        onEditAnswer={handleEditAnswer}
        onSaveAnswer={handleSaveAnswer}
        onCancelEdit={handleCancelEdit}
        onExport={handleExport}
        onToggleSource={handleToggleSource}
        totalCount={totalCount}
        answeredCount={answeredCount}
        progressPercentage={progressPercentage}
      />
    </div>
  );
}

