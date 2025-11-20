"use client";

import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";

import { Button } from "@trycompai/ui/button";
import { Textarea } from "@trycompai/ui/textarea";

import type { QuestionAnswer } from "./types";

interface QuestionnaireResultsCardsProps {
  orgId: string;
  results: QuestionAnswer[];
  filteredResults: QuestionAnswer[];
  editingIndex: number | null;
  editingAnswer: string;
  onEditingAnswerChange: (answer: string) => void;
  expandedSources: Set<number>;
  questionStatuses: Map<number, "pending" | "processing" | "completed">;
  answeringQuestionIndex: number | null;
  isAutoAnswering: boolean;
  hasClickedAutoAnswer: boolean;
  onEditAnswer: (index: number) => void;
  onSaveAnswer: (index: number) => void;
  onCancelEdit: () => void;
  onAnswerSingleQuestion: (index: number) => void;
  onToggleSource: (index: number) => void;
}

export function QuestionnaireResultsCards({
  orgId,
  results,
  filteredResults,
  editingIndex,
  editingAnswer,
  onEditingAnswerChange,
  expandedSources,
  questionStatuses,
  answeringQuestionIndex,
  isAutoAnswering,
  hasClickedAutoAnswer,
  onEditAnswer,
  onSaveAnswer,
  onCancelEdit,
  onAnswerSingleQuestion,
  onToggleSource,
}: QuestionnaireResultsCardsProps) {
  return (
    <div className="space-y-4 lg:hidden">
      {filteredResults.map((qa, index) => {
        const originalIndex = results.findIndex((r) => r === qa);
        const isEditing = editingIndex === originalIndex;
        const questionStatus = questionStatuses.get(originalIndex);
        const isProcessing = questionStatus === "processing";

        return (
          <div
            key={originalIndex}
            className="bg-muted/20 border-border/30 flex flex-col gap-3 rounded-xs border p-4"
          >
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs font-medium tabular-nums">
                Question {originalIndex + 1}
              </span>
              <p className="text-foreground text-sm font-medium">
                {qa.question}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                Answer
              </span>
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingAnswer}
                    onChange={(e) => onEditingAnswerChange(e.target.value)}
                    className="min-h-[80px]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onSaveAnswer(originalIndex)}
                    >
                      Save
                    </Button>
                    <Button size="sm" onClick={onCancelEdit} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {qa.answer ? (
                    <div
                      className="bg-muted/30 border-border/30 hover:bg-muted/50 cursor-pointer rounded-xs border p-3 transition-colors"
                      onClick={() => onEditAnswer(originalIndex)}
                    >
                      <p className="text-foreground text-sm">{qa.answer}</p>
                    </div>
                  ) : isProcessing ? (
                    <div className="bg-muted/30 border-border/30 flex items-center gap-2 rounded-xs border p-3">
                      <Loader2 className="text-primary h-4 w-4 shrink-0 animate-spin" />
                      <span className="text-muted-foreground text-sm">
                        Generating answer...
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {!qa.failedToGenerate && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAnswerSingleQuestion(originalIndex);
                          }}
                          disabled={
                            answeringQuestionIndex === originalIndex ||
                            (isAutoAnswering && hasClickedAutoAnswer)
                          }
                          className="w-full justify-center"
                        >
                          Answer
                        </Button>
                      )}
                      {qa.failedToGenerate && (
                        <div className="bg-muted/30 border-border/30 rounded-xs border p-2">
                          <p className="text-muted-foreground text-center text-xs">
                            Insufficient information in policies. Please write
                            answer manually.
                          </p>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditAnswer(originalIndex)}
                        className="w-full justify-center"
                      >
                        Write Answer
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {qa.sources && qa.sources.length > 0 && (
              <div className="border-border/30 border-t pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleSource(originalIndex)}
                  className="text-muted-foreground hover:text-foreground h-auto w-full justify-start p-1 text-xs"
                >
                  <BookOpen className="mr-1 h-3 w-3" />
                  {expandedSources.has(originalIndex) ? (
                    <>
                      Hide sources ({qa.sources.length})
                      <ChevronUp className="ml-1 h-3 w-3" />
                    </>
                  ) : (
                    <>
                      Show sources ({qa.sources.length})
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </>
                  )}
                </Button>
                {expandedSources.has(originalIndex) && (
                  <div className="border-muted/30 mt-2 space-y-1 border-l-2 pl-4">
                    {qa.sources.map((source, sourceIndex) => {
                      const isPolicy =
                        source.sourceType === "policy" && source.sourceId;
                      const sourceContent =
                        source.sourceName || source.sourceType;

                      return (
                        <div
                          key={sourceIndex}
                          className="flex items-center gap-2 text-xs"
                        >
                          <div className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                          {isPolicy ? (
                            <Link
                              href={`/${orgId}/policies/${source.sourceId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
                            >
                              {sourceContent}
                              <LinkIcon className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="text-muted-foreground font-medium">
                              {sourceContent}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
