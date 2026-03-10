'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@comp/ui/alert-dialog';
import { Button } from '@comp/ui/button';
import { Card } from '@comp/ui';
import { ChevronLeft, ChevronRight, ExternalLink, PenTool, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import { usePagination } from '../../hooks/usePagination';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useManualAnswers } from '../../../hooks/useManualAnswers';
import type { ManualAnswer } from '../../../components/types';

interface ManualAnswersSectionProps {
  manualAnswers: ManualAnswer[];
}

export function ManualAnswersSection({ manualAnswers: initialManualAnswers }: ManualAnswersSectionProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const sectionRef = useRef<HTMLDivElement>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [answerIdToDelete, setAnswerIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string>('');

  const {
    manualAnswers,
    deleteAnswer,
    deleteAll,
  } = useManualAnswers({ organizationId: orgId, fallbackData: initialManualAnswers });

  const { currentPage, totalPages, paginatedItems, handlePageChange } = usePagination({
    items: manualAnswers,
    itemsPerPage: 10,
  });

  const handleDelete = (answerId: string) => {
    setAnswerIdToDelete(answerId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!answerIdToDelete) return;

    setIsDeleting(true);
    try {
      await deleteAnswer(answerIdToDelete);
      toast.success('Manual answer deleted successfully');
      setDeleteDialogOpen(false);
      setAnswerIdToDelete(null);
    } catch (error) {
      console.error('Error deleting manual answer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete manual answer');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = () => {
    setDeleteAllDialogOpen(true);
  };

  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await deleteAll();
      toast.success('All manual answers deleted successfully');
      setDeleteAllDialogOpen(false);
    } catch (error) {
      console.error('Error deleting all manual answers:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete all manual answers');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleAccordionChange = (value: string) => {
    if (value === 'manual-answers' && sectionRef.current) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // Handle hash navigation on mount and when hash changes
  useEffect(() => {
    const handleHashNavigation = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#manual-answer-')) {
        const manualAnswerId = hash.replace('#manual-answer-', '');
        const answerElement = document.getElementById(`manual-answer-${manualAnswerId}`);

        if (answerElement) {
          setAccordionValue('manual-answers');
          setTimeout(() => {
            answerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            answerElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
            setTimeout(() => {
              answerElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            }, 2000);
          }, 300);
        }
      }
    };

    handleHashNavigation();
    window.addEventListener('hashchange', handleHashNavigation);
    return () => { window.removeEventListener('hashchange', handleHashNavigation); };
  }, []);

  return (
    <Card ref={sectionRef} id="manual-answers">
      <Accordion
        type="single"
        collapsible
        className="w-full"
        value={accordionValue}
        onValueChange={(value) => {
          setAccordionValue(value);
          handleAccordionChange(value);
        }}
      >
        <AccordionItem value="manual-answers" className="border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-muted-foreground" />
              <span className="text-base font-semibold">Manual Answers</span>
              <span className="text-sm text-muted-foreground">
                ({manualAnswers.length})
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            {manualAnswers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No manual answers yet. Answers you write manually in questionnaires will appear here.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <ManualAnswersList
                  paginatedItems={paginatedItems}
                  isDeleting={isDeleting}
                  answerIdToDelete={answerIdToDelete}
                  orgId={orgId}
                  onDelete={handleDelete}
                />
                <ManualAnswersFooter
                  total={manualAnswers.length}
                  paginatedCount={paginatedItems.length}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  onDeleteAll={handleDeleteAll}
                />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Delete Single Answer Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Manual Answer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this manual answer? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Answers Dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Manual Answers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {manualAnswers.length} manual answers? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAll}
              disabled={isDeletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAll ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function ManualAnswersList({
  paginatedItems,
  isDeleting,
  answerIdToDelete,
  orgId,
  onDelete,
}: {
  paginatedItems: ManualAnswer[];
  isDeleting: boolean;
  answerIdToDelete: string | null;
  orgId: string;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {paginatedItems.map((answer) => {
        const isItemDeleting = isDeleting && answerIdToDelete === answer.id;
        return (
          <div
            key={answer.id}
            id={`manual-answer-${answer.id}`}
            className={`group flex items-start justify-between gap-4 rounded-xs border border-border/30 bg-muted/20 p-4 transition-colors hover:bg-muted/30 ${
              isItemDeleting ? 'opacity-50' : ''
            }`}
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium text-foreground leading-relaxed">
                  {answer.question}
                </h4>
                <div className="flex items-center gap-2">
                  {answer.sourceQuestionnaireId && (
                    <Link
                      href={`/${orgId}/questionnaire/${answer.sourceQuestionnaireId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(answer.id);
                    }}
                    disabled={isItemDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{answer.answer}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Updated {format(new Date(answer.updatedAt), 'MMM dd, yyyy')}</span>
                {answer.tags && answer.tags.length > 0 && (
                  <span className="flex items-center gap-1">
                    <span>Tags:</span>
                    <span className="font-medium">{answer.tags.join(', ')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ManualAnswersFooter({
  total,
  paginatedCount,
  currentPage,
  totalPages,
  onPageChange,
  onDeleteAll,
}: {
  total: number;
  paginatedCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onDeleteAll: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-border/30 pt-4">
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {paginatedCount} of {total} answers
        </div>
        {total > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteAll}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All
          </Button>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
