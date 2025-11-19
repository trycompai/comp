'use client';

import { Button } from '@comp/ui/button';
import { Textarea } from '@comp/ui/textarea';
import { BookOpen, ChevronDown, ChevronUp, Link as LinkIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { QuestionAnswer } from './types';

interface QuestionnaireResultsCardsProps {
  orgId: string;
  results: QuestionAnswer[];
  filteredResults: QuestionAnswer[];
  editingIndex: number | null;
  editingAnswer: string;
  onEditingAnswerChange: (answer: string) => void;
  expandedSources: Set<number>;
  questionStatuses: Map<number, 'pending' | 'processing' | 'completed'>;
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
    <div className="lg:hidden space-y-4">
      {filteredResults.map((qa, index) => {
        // Use originalIndex if available (from detail page), otherwise find by question text
        const originalIndex = (qa as any)._originalIndex !== undefined 
          ? (qa as any)._originalIndex 
          : results.findIndex((r) => r.question === qa.question);
        // Fallback to index if not found (shouldn't happen, but safety check)
        const safeIndex = originalIndex >= 0 ? originalIndex : index;
        const isEditing = editingIndex === safeIndex;
        const questionStatus = questionStatuses.get(safeIndex);
        const isProcessing = questionStatus === 'processing' || answeringQuestionIndex === safeIndex;

        return (
          <div
            key={`card-${safeIndex}-${qa.question.substring(0, 20)}`}
            className="flex flex-col gap-3 p-4 rounded-xs bg-muted/20 border border-border/30"
          >
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                Question {safeIndex + 1}
              </span>
              <p className="text-sm font-medium text-foreground">{qa.question}</p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Answer</span>
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingAnswer}
                    onChange={(e) => onEditingAnswerChange(e.target.value)}
                    className="min-h-[80px]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => onSaveAnswer(safeIndex)}>
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
                      className="rounded-xs p-3 bg-muted/30 border border-border/30 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onEditAnswer(safeIndex)}
                    >
                      <p className="text-sm text-foreground">{qa.answer}</p>
                    </div>
                  ) : isProcessing ? (
                    <div className="flex items-center gap-2 p-3 rounded-xs bg-muted/30 border border-border/30">
                      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                      <span className="text-sm text-muted-foreground">Finding answer...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {!qa.failedToGenerate && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAnswerSingleQuestion(safeIndex);
                          }}
                          disabled={
                            answeringQuestionIndex === safeIndex ||
                            (isAutoAnswering && hasClickedAutoAnswer)
                          }
                          className="w-full justify-center"
                        >
                          Answer
                        </Button>
                      )}
                      {qa.failedToGenerate && (
                        <div className="p-2 rounded-xs bg-muted/30 border border-border/30">
                          <p className="text-xs text-muted-foreground text-center">
                            Insufficient information in policies. Please write answer manually.
                          </p>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditAnswer(safeIndex)}
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
              <div className="pt-2 border-t border-border/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleSource(safeIndex)}
                  className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground w-full justify-start"
                >
                  <BookOpen className="mr-1 h-3 w-3" />
                  {expandedSources.has(safeIndex) ? (
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
                {expandedSources.has(safeIndex) && (
                  <div className="mt-2 space-y-1 pl-4 border-l-2 border-muted/30">
                    {qa.sources.map((source, sourceIndex) => {
                      const isPolicy = source.sourceType === 'policy' && source.sourceId;
                      const sourceContent = source.sourceName || source.sourceType;

                      return (
                        <div key={sourceIndex} className="flex items-center gap-2 text-xs">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          {isPolicy ? (
                            <Link
                              href={`/${orgId}/policies/${source.sourceId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {sourceContent}
                              <LinkIcon className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="font-medium text-muted-foreground">
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
