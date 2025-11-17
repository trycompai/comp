'use client';

import { QuestionnaireResults } from './QuestionnaireResults';
import { QuestionnaireUpload } from './QuestionnaireUpload';
import { useQuestionnaireParser } from '../hooks/useQuestionnaireParser';

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

    if (!results || results.length === 0) {
    return (
      <QuestionnaireUpload
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
        onFileRemove={() => setSelectedFile(null)}
        onParse={handleParse}
        isLoading={isLoading}
        parseStatus={parseStatus}
        orgId={orgId}
      />
    );
  }

  return (
    <QuestionnaireResults
      orgId={orgId}
      results={results}
      filteredResults={filteredResults}
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
      showExitDialog={showExitDialog}
      onShowExitDialogChange={setShowExitDialog}
      onExit={confirmReset}
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
  );
}
