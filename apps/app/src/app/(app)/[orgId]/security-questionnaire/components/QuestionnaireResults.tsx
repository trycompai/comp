"use client";

import { Search } from "lucide-react";

import { ScrollArea } from "@trycompai/ui/scroll-area";

import type { QuestionAnswer } from "./types";
import { QuestionnaireResultsCards } from "./QuestionnaireResultsCards";
import { QuestionnaireResultsHeader } from "./QuestionnaireResultsHeader";
import { QuestionnaireResultsTable } from "./QuestionnaireResultsTable";

interface QuestionnaireResultsProps {
  orgId: string;
  results: QuestionAnswer[];
  filteredResults: QuestionAnswer[] | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  editingIndex: number | null;
  editingAnswer: string;
  onEditingAnswerChange: (answer: string) => void;
  expandedSources: Set<number>;
  questionStatuses: Map<number, "pending" | "processing" | "completed">;
  answeringQuestionIndex: number | null;
  hasClickedAutoAnswer: boolean;
  isLoading: boolean;
  isAutoAnswering: boolean;
  isExporting: boolean;
  showExitDialog: boolean;
  onShowExitDialogChange: (show: boolean) => void;
  onExit: () => void;
  onAutoAnswer: () => void;
  onAnswerSingleQuestion: (index: number) => void;
  onEditAnswer: (index: number) => void;
  onSaveAnswer: (index: number) => void;
  onCancelEdit: () => void;
  onExport: (format: "xlsx" | "csv" | "pdf") => void;
  onToggleSource: (index: number) => void;
  totalCount: number;
  answeredCount: number;
  progressPercentage: number;
}

export function QuestionnaireResults({
  orgId,
  results,
  filteredResults,
  searchQuery,
  onSearchChange,
  editingIndex,
  editingAnswer,
  onEditingAnswerChange,
  expandedSources,
  questionStatuses,
  answeringQuestionIndex,
  hasClickedAutoAnswer,
  isLoading,
  isAutoAnswering,
  isExporting,
  showExitDialog,
  onShowExitDialogChange,
  onExit,
  onAutoAnswer,
  onAnswerSingleQuestion,
  onEditAnswer,
  onSaveAnswer,
  onCancelEdit,
  onExport,
  onToggleSource,
  totalCount,
  answeredCount,
  progressPercentage,
}: QuestionnaireResultsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <QuestionnaireResultsHeader
        showExitDialog={showExitDialog}
        onShowExitDialogChange={onShowExitDialogChange}
        onExit={onExit}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        filteredResults={filteredResults}
        totalCount={totalCount}
        answeredCount={answeredCount}
        progressPercentage={progressPercentage}
        hasClickedAutoAnswer={hasClickedAutoAnswer}
        results={results}
        isLoading={isLoading}
        isAutoAnswering={isAutoAnswering}
        isExporting={isExporting}
        onAutoAnswer={onAutoAnswer}
        onExport={onExport}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {results && results.length > 0 ? (
          <>
            <ScrollArea className="min-w-0 flex-1">
              <div className="min-w-0">
                {filteredResults && filteredResults.length > 0 ? (
                  <>
                    <div className="hidden lg:block">
                      <QuestionnaireResultsTable
                        orgId={orgId}
                        results={results}
                        filteredResults={filteredResults as QuestionAnswer[]}
                        editingIndex={editingIndex}
                        editingAnswer={editingAnswer}
                        onEditingAnswerChange={onEditingAnswerChange}
                        expandedSources={expandedSources}
                        questionStatuses={questionStatuses}
                        answeringQuestionIndex={answeringQuestionIndex}
                        isAutoAnswering={isAutoAnswering}
                        hasClickedAutoAnswer={hasClickedAutoAnswer}
                        onEditAnswer={onEditAnswer}
                        onSaveAnswer={onSaveAnswer}
                        onCancelEdit={onCancelEdit}
                        onAnswerSingleQuestion={onAnswerSingleQuestion}
                        onToggleSource={onToggleSource}
                      />
                    </div>

                    <QuestionnaireResultsCards
                      orgId={orgId}
                      results={results}
                      filteredResults={filteredResults as QuestionAnswer[]}
                      editingIndex={editingIndex}
                      editingAnswer={editingAnswer}
                      onEditingAnswerChange={onEditingAnswerChange}
                      expandedSources={expandedSources}
                      questionStatuses={questionStatuses}
                      answeringQuestionIndex={answeringQuestionIndex}
                      isAutoAnswering={isAutoAnswering}
                      hasClickedAutoAnswer={hasClickedAutoAnswer}
                      onEditAnswer={onEditAnswer}
                      onSaveAnswer={onSaveAnswer}
                      onCancelEdit={onCancelEdit}
                      onAnswerSingleQuestion={onAnswerSingleQuestion}
                      onToggleSource={onToggleSource}
                    />
                  </>
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                    <Search className="mb-3 h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">No matches found</p>
                    <p className="text-xs">Try a different search term</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : null}
      </div>
    </div>
  );
}
