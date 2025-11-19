'use client';

import { Button } from '@comp/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@comp/ui/table';
import { Textarea } from '@comp/ui/textarea';
import { BookOpen, ChevronDown, ChevronUp, Link as LinkIcon, Loader2, Zap } from 'lucide-react';
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
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-12 text-xs font-semibold pl-6">#</TableHead>
            <TableHead className="w-1/2 text-xs font-semibold">Question</TableHead>
            <TableHead className="w-1/2 text-xs font-semibold pr-6">Answer</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredResults.map((qa, index) => {
            const originalIndex = results.findIndex((r) => r === qa);
            const isEditing = editingIndex === originalIndex;
            const questionStatus = questionStatuses.get(originalIndex);
            const isProcessing = questionStatus === 'processing';

            return (
              <TableRow key={originalIndex} className="group">
                <TableCell className="align-top py-6 font-medium pl-6">
                  <span className="tabular-nums text-muted-foreground">{originalIndex + 1}</span>
                </TableCell>
                <TableCell className="align-top py-6 font-medium w-1/2">
                  <p className="leading-relaxed">{qa.question}</p>
                </TableCell>
                <TableCell className="align-top py-6 pr-6 w-1/2">
                  {isEditing ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editingAnswer}
                        onChange={(e) => onEditingAnswerChange(e.target.value)}
                        className="min-h-[120px]"
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
                    <div className="space-y-3">
                      {qa.answer ? (
                        <div className="cursor-pointer" onClick={() => onEditAnswer(originalIndex)}>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {qa.answer}
                          </p>
                        </div>
                      ) : isProcessing ? (
                        <div className="flex items-center gap-2 py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Finding answer...</span>
                        </div>
                      ) : qa.failedToGenerate ? (
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm text-muted-foreground italic">
                            Could not find an answer
                          </p>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditAnswer(originalIndex);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Write Answer
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditAnswer(originalIndex);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Write Answer
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnswerSingleQuestion(originalIndex);
                            }}
                            disabled={
                              isProcessing ||
                              (isAutoAnswering && answeringQuestionIndex !== originalIndex)
                            }
                            size="sm"
                          >
                            <Zap className="size-4" />
                            Auto-Fill
                          </Button>
                        </div>
                      )}

                      {qa.sources && qa.sources.length > 0 && (
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleSource(originalIndex)}
                            className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground -ml-2"
                          >
                            <BookOpen className="mr-1.5 h-3 w-3" />
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
                            <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-muted">
                              {qa.sources.map((source, sourceIndex) => {
                                const isPolicy = source.sourceType === 'policy' && source.sourceId;
                                const sourceContent = source.sourceName || source.sourceType;

                                return (
                                  <div
                                    key={sourceIndex}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                    {isPolicy ? (
                                      <Link
                                        href={`/${orgId}/policies/${source.sourceId}`}
                                        className="text-primary hover:underline flex items-center gap-1"
                                        target="_blank"
                                      >
                                        {sourceContent}
                                        <LinkIcon className="h-3 w-3" />
                                      </Link>
                                    ) : (
                                      <span className="text-muted-foreground">{sourceContent}</span>
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
    </div>
  );
}
