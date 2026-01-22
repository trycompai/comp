'use client';

import { useQuestionnaireParser } from '../hooks/useQuestionnaireParser';
import { QuestionnaireView } from './QuestionnaireView';

export function QuestionnaireParser() {
  const {
    orgId,
    selectedFile,
    setSelectedFile,
    showExitDialog,
    setShowExitDialog,
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
    parseStatus,
    isAutoAnswering,
    isExporting,
    filteredResults,
    answeredCount,
    totalCount,
    progressPercentage,
    handleFileSelect,
    handleParse,
    confirmReset,
    handleAutoAnswer,
    handleAnswerSingleQuestion,
    handleEditAnswer,
    handleSaveAnswer,
    handleCancelEdit,
    handleExport,
    handleToggleSource,
  } = useQuestionnaireParser();

  const normalizedResults =
    results?.map((result) => ({
      ...result,
      sources: result.sources ?? [],
    })) ?? null;

  const normalizedFilteredResults =
    filteredResults?.map((result) => ({
      ...result,
      sources: result.sources ?? [],
    })) ?? null;

  return (
    <QuestionnaireView
      orgId={orgId}
      results={normalizedResults}
      filteredResults={normalizedFilteredResults}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      editingIndex={editingIndex}
      editingAnswer={editingAnswer}
      setEditingAnswer={setEditingAnswer}
      expandedSources={expandedSources}
      questionStatuses={questionStatuses}
      answeringQuestionIndex={answeringQuestionIndex}
      hasClickedAutoAnswer={hasClickedAutoAnswer}
      isLoading={isLoading}
      isAutoAnswering={isAutoAnswering}
      isExporting={isExporting}
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
      // New questionnaire specific props
      selectedFile={selectedFile}
      onFileSelect={handleFileSelect}
      onFileRemove={() => setSelectedFile(null)}
      onParse={handleParse}
      parseStatus={parseStatus}
      showExitDialog={showExitDialog}
      onShowExitDialogChange={setShowExitDialog}
      onExit={confirmReset}
    />
  );
}
