'use client';

import { Button } from '@comp/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@comp/ui/table';
import { Textarea } from '@comp/ui/textarea';
import { BookOpen, ChevronDown, ChevronUp, Link as LinkIcon, Loader2, Zap, Pencil } from 'lucide-react';
import Link from 'next/link';
import type { QuestionAnswer } from './types';
import { deduplicateSources } from '../utils/deduplicate-sources';
import { KnowledgeBaseDocumentLink } from './KnowledgeBaseDocumentLink';
import { ManualAnswerLink } from './ManualAnswerLink';

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
  answerQueue?: number[];
  isAutoAnswering: boolean;
  hasClickedAutoAnswer: boolean;
  isSaving?: boolean;
  savingIndex?: number | null;
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
  answerQueue = [],
  isAutoAnswering,
  hasClickedAutoAnswer,
  isSaving,
  savingIndex,
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
            // Use originalIndex if available (from detail page), otherwise find by question text
            const originalIndex = qa._originalIndex !== undefined 
              ? qa._originalIndex 
              : results.findIndex((r) => r.question === qa.question);
            // Fallback to index if not found (shouldn't happen, but safety check)
            const safeIndex = originalIndex >= 0 ? originalIndex : index;
            const isEditing = editingIndex === safeIndex;
            const questionStatus = questionStatuses.get(safeIndex);
            // Check if question is in queue (waiting to be processed)
            const isQueued = answerQueue.includes(safeIndex);
            // Determine if this question is being processed
            // It's processing if:
            // 1. Status is explicitly 'processing'
            // 2. This is the single question being answered
            // 3. Auto-answer is running and this question doesn't have an answer yet (or has empty answer)
            const isProcessing = 
              questionStatus === 'processing' || 
              answeringQuestionIndex === safeIndex ||
              (isAutoAnswering && hasClickedAutoAnswer && (!qa.answer || qa.answer.trim().length === 0) && questionStatus !== 'completed');
            
            // Deduplicate sources for this question
            const uniqueSources = qa.sources ? deduplicateSources(qa.sources) : [];

            return (
              <TableRow 
                key={`row-${safeIndex}-${qa.question.substring(0, 20)}`} 
                className="group animate-in fade-in duration-500 ease-out"
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards'
                }}
              >
                <TableCell className="align-top py-6 font-medium pl-6">
                  <span className="tabular-nums text-muted-foreground">{safeIndex + 1}</span>
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
                        <Button 
                          size="sm" 
                          onClick={() => onSaveAnswer(safeIndex)}
                          disabled={isSaving && savingIndex === safeIndex}
                        >
                          {isSaving && savingIndex === safeIndex ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save'
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={onCancelEdit} 
                          variant="outline"
                          disabled={isSaving && savingIndex === safeIndex}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {qa.answer && qa.answer.trim().length > 0 ? (
                        <div 
                          className="group relative cursor-pointer rounded-md p-2 -m-2 border border-transparent transition-colors duration-150 ease-in-out hover:bg-muted/30 hover:border-primary/30"
                          onClick={() => onEditAnswer(safeIndex)}
                          title="Click to edit"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-muted-foreground leading-relaxed flex-1 transition-colors duration-150 group-hover:text-foreground/80">
                              {qa.answer}
                            </p>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-70 transition-opacity duration-150 ease-in-out flex-shrink-0 mt-0.5" />
                          </div>
                        </div>
                      ) : isProcessing ? (
                        <div className="flex items-center justify-end gap-2 py-2 min-h-[40px]">
                          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                          <span className="text-sm text-muted-foreground">Finding answer...</span>
                        </div>
                      ) : isQueued ? (
                        <div className="flex items-center justify-end gap-2 py-2 min-h-[40px]">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
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
                              onEditAnswer(safeIndex);
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
                              onEditAnswer(safeIndex);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Write Answer
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnswerSingleQuestion(safeIndex);
                            }}
                            disabled={
                              isProcessing ||
                              (isAutoAnswering && answeringQuestionIndex !== safeIndex)
                            }
                            size="sm"
                          >
                            <Zap className="size-4" />
                            Auto-Fill
                          </Button>
                        </div>
                      )}

                      {uniqueSources.length > 0 && (
                        <div className="mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleSource(safeIndex)}
                            className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground -ml-2"
                          >
                            <BookOpen className="mr-1.5 h-3 w-3" />
                            {expandedSources.has(safeIndex) ? (
                              <>
                                Hide sources ({uniqueSources.length})
                                <ChevronUp className="ml-1 h-3 w-3" />
                              </>
                            ) : (
                              <>
                                Show sources ({uniqueSources.length})
                                <ChevronDown className="ml-1 h-3 w-3" />
                              </>
                            )}
                          </Button>
                          {expandedSources.has(safeIndex) && (
                            <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-muted">
                              {uniqueSources.map((source, sourceIndex) => {
                                const isPolicy = source.sourceType === 'policy' && source.sourceId;
                                const isKnowledgeBaseDocument =
                                  source.sourceType === 'knowledge_base_document' && source.sourceId;
                                const isManualAnswer =
                                  source.sourceType === 'manual_answer' && source.sourceId;
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
                                    ) : isKnowledgeBaseDocument && source.sourceId ? (
                                      <KnowledgeBaseDocumentLink
                                        documentId={source.sourceId}
                                        sourceName={sourceContent}
                                        orgId={orgId}
                                        className="text-primary hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                      />
                                    ) : isManualAnswer && source.sourceId ? (
                                      <ManualAnswerLink
                                        manualAnswerId={source.sourceId}
                                        sourceName={sourceContent}
                                        orgId={orgId}
                                        className="text-primary hover:underline flex items-center gap-1"
                                      />
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
