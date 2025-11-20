"use client";

import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Loader2,
  Zap,
} from "lucide-react";

import { Button } from "@trycompai/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@trycompai/ui/table";
import { Textarea } from "@trycompai/ui/textarea";

import type { QuestionAnswer } from "./types";

interface QuestionnaireResultsTableProps {
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
    <div className="border-border overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-12 pl-6 text-xs font-semibold">#</TableHead>
            <TableHead className="w-1/2 text-xs font-semibold">
              Question
            </TableHead>
            <TableHead className="w-1/2 pr-6 text-xs font-semibold">
              Answer
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredResults.map((qa, index) => {
            const originalIndex = results.findIndex((r) => r === qa);
            const isEditing = editingIndex === originalIndex;
            const questionStatus = questionStatuses.get(originalIndex);
            const isProcessing = questionStatus === "processing";

            return (
              <TableRow key={originalIndex} className="group">
                <TableCell className="py-6 pl-6 align-top font-medium">
                  <span className="text-muted-foreground tabular-nums">
                    {originalIndex + 1}
                  </span>
                </TableCell>
                <TableCell className="w-1/2 py-6 align-top font-medium">
                  <p className="leading-relaxed">{qa.question}</p>
                </TableCell>
                <TableCell className="w-1/2 py-6 pr-6 align-top">
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
                          onClick={() => onSaveAnswer(originalIndex)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          onClick={onCancelEdit}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {qa.answer ? (
                        <div
                          className="cursor-pointer"
                          onClick={() => onEditAnswer(originalIndex)}
                        >
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {qa.answer}
                          </p>
                        </div>
                      ) : isProcessing ? (
                        <div className="flex items-center gap-2 py-2">
                          <Loader2 className="text-primary h-4 w-4 animate-spin" />
                          <span className="text-muted-foreground text-sm">
                            Finding answer...
                          </span>
                        </div>
                      ) : qa.failedToGenerate ? (
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-muted-foreground text-sm italic">
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
                        <div className="flex justify-end gap-2">
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
                              (isAutoAnswering &&
                                answeringQuestionIndex !== originalIndex)
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
                            className="text-muted-foreground hover:text-foreground -ml-2 h-auto p-1 text-xs"
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
                            <div className="border-muted mt-2 space-y-1.5 border-l-2 pl-4">
                              {qa.sources.map((source, sourceIndex) => {
                                const isPolicy =
                                  source.sourceType === "policy" &&
                                  source.sourceId;
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
                                        className="text-primary flex items-center gap-1 hover:underline"
                                        target="_blank"
                                      >
                                        {sourceContent}
                                        <LinkIcon className="h-3 w-3" />
                                      </Link>
                                    ) : (
                                      <span className="text-muted-foreground">
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
    </div>
  );
}
