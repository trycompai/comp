'use client';

import { Button } from '@comp/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@comp/ui/table';
import { Textarea } from '@comp/ui/textarea';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Loader2,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import type { QuestionAnswer } from './types';

interface QuestionnaireResultsTableProps {
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

export function QuestionnaireResultsTable({
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
}: QuestionnaireResultsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-border/50">
          <TableHead className="w-12 text-xs">#</TableHead>
          <TableHead className="min-w-[300px] text-xs">Question</TableHead>
          <TableHead className="min-w-[300px] text-xs">Answer</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredResults.map((qa, index) => {
          const originalIndex = results.findIndex((r) => r === qa);
          const isEditing = editingIndex === originalIndex;
          const questionStatus = questionStatuses.get(originalIndex);
          const isProcessing = questionStatus === 'processing';

          return (
            <TableRow key={originalIndex} className="border-muted/30">
              <TableCell className="font-medium align-middle">
                <span className="tabular-nums">{originalIndex + 1}</span>
              </TableCell>
              <TableCell className="font-medium align-middle">{qa.question}</TableCell>
              <TableCell className="align-middle">
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingAnswer}
                      onChange={(e) => onEditingAnswerChange(e.target.value)}
                      className="min-h-[80px]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onSaveAnswer(originalIndex)}>
                        Save
                      </Button>
                      <Button size="sm" onClick={onCancelEdit} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {qa.answer ? (
                      <div
                        className="rounded-xs p-2 transition-colors flex items-start gap-2 cursor-pointer hover:bg-muted/50"
                        onClick={() => onEditAnswer(originalIndex)}
                      >
                        <p className="text-sm text-foreground min-h-[20px] flex-1">{qa.answer}</p>
                      </div>
                    ) : isProcessing ? (
                      <div className="flex items-center gap-2 p-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                        <span className="text-sm text-muted-foreground">Generating answer...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 w-full">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditAnswer(originalIndex)}
                          className="h-8 w-full"
                        >
                          Write Answer
                        </Button>
                        {!qa.failedToGenerate ? (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnswerSingleQuestion(originalIndex);
                            }}
                            disabled={answeringQuestionIndex === originalIndex || (isAutoAnswering && hasClickedAutoAnswer)}
                            className="h-8 w-full"
                          >
                            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                            Auto-Answer
                          </Button>
                        ) : (
                          <div className="h-8 flex items-center justify-center px-2 rounded-xs bg-muted/30 border border-border/30">
                            <span className="text-xs text-muted-foreground text-center">
                              Insufficient data
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {qa.sources && qa.sources.length > 0 && (
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleSource(originalIndex)}
                          className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
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
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

