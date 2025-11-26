'use client';

import { QuestionnaireView } from '../../components/QuestionnaireView';
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
    answerQueue,
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
    <QuestionnaireView
      orgId={organizationId}
      results={results.map((r, index) => ({
        question: r.question,
        answer: r.answer,
        sources: r.sources,
        failedToGenerate: r.failedToGenerate ?? false,
        status: r.status ?? 'untouched',
        _originalIndex: r.originalIndex ?? index,
      }))}
      filteredResults={filteredResults?.map((r, index) => ({
        question: r.question,
        answer: r.answer,
        sources: r.sources,
        failedToGenerate: r.failedToGenerate ?? false,
        status: r.status ?? 'untouched',
        _originalIndex: r.originalIndex ?? index,
      }))}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      editingIndex={editingIndex}
      editingAnswer={editingAnswer}
      setEditingAnswer={setEditingAnswer}
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
      totalCount={totalCount}
      answeredCount={answeredCount}
      progressPercentage={progressPercentage}
      onAutoAnswer={handleAutoAnswer}
      onAnswerSingleQuestion={handleAnswerSingleQuestion}
      onEditAnswer={handleEditAnswer}
      onSaveAnswer={handleSaveAnswer}
      onCancelEdit={handleCancelEdit}
      onExport={handleExport}
      onToggleSource={handleToggleSource}
      filename={filename}
      description="Review and manage answers for this questionnaire"
    />
  );
}

