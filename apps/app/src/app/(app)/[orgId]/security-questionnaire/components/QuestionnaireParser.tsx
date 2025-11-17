'use client';

import { useQuestionnaireParser } from '../hooks/useQuestionnaireParser';
import { QuestionnaireResults } from './QuestionnaireResults';
import { QuestionnaireSidebar } from './QuestionnaireSidebar';
import { QuestionnaireUpload } from './QuestionnaireUpload';

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

  const hasResults = results && results.length > 0;

  if (!hasResults) {
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
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onFileRemove={() => setSelectedFile(null)}
              onParse={handleParse}
              isLoading={isLoading}
              parseStatus={parseStatus}
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl lg:text-2xl font-semibold text-foreground">Security Questionnaire</h1>
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
    </div>
  );
}
