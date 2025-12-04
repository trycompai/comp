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
import { useParams, useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import { usePagination } from '../../hooks/usePagination';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';

interface ManualAnswersSectionProps {
  manualAnswers: Awaited<ReturnType<typeof import('../../data/queries').getManualAnswers>>;
}

export function ManualAnswersSection({ manualAnswers }: ManualAnswersSectionProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const router = useRouter();
  const sectionRef = useRef<HTMLDivElement>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [answerIdToDelete, setAnswerIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string>('');

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
      const response = await api.post<{ success: boolean; error?: string }>(
        `/v1/knowledge-base/manual-answers/${answerIdToDelete}/delete`,
        {
          organizationId: orgId,
        },
        orgId,
      );

      if (response.error) {
        toast.error(response.error || 'Failed to delete manual answer');
        setIsDeleting(false);
        return;
      }

      if (response.data?.success) {
        toast.success('Manual answer deleted successfully');
        setDeleteDialogOpen(false);
        setAnswerIdToDelete(null);
        router.refresh();
      } else {
        toast.error(response.data?.error || 'Failed to delete manual answer');
      }
    } catch (error) {
      console.error('Error deleting manual answer:', error);
      toast.error('Failed to delete manual answer');
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
      const response = await api.post<{ success: boolean; error?: string }>(
        '/v1/knowledge-base/manual-answers/delete-all',
        {
          organizationId: orgId,
        },
        orgId,
      );

      if (response.error) {
        toast.error(response.error || 'Failed to delete all manual answers');
        setIsDeletingAll(false);
        return;
      }

      if (response.data?.success) {
        toast.success('All manual answers deleted successfully');
        setDeleteAllDialogOpen(false);
        router.refresh();
      } else {
        toast.error(response.data?.error || 'Failed to delete all manual answers');
      }
    } catch (error) {
      console.error('Error deleting all manual answers:', error);
      toast.error('Failed to delete all manual answers');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleAccordionChange = (value: string) => {
    // If opening (value is set), scroll to section
    if (value === 'manual-answers' && sectionRef.current) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100); // Small delay to allow accordion animation to start
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
          // Open accordion first
          setAccordionValue('manual-answers');
          
          // Scroll to the specific manual answer after accordion opens
          setTimeout(() => {
            answerElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
            // Highlight the element briefly
            answerElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
            setTimeout(() => {
              answerElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            }, 2000);
          }, 300); // Wait for accordion animation
        }
      }
    };

    // Check hash on mount
    handleHashNavigation();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashNavigation);

    return () => {
      window.removeEventListener('hashchange', handleHashNavigation);
    };
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
                                  handleDelete(answer.id);
                                }}
                                disabled={isItemDeleting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {answer.answer}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              Updated {format(new Date(answer.updatedAt), 'MMM dd, yyyy')}
                            </span>
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

                {/* Pagination and Delete All */}
                <div className="flex items-center justify-between border-t border-border/30 pt-4">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {paginatedItems.length} of {manualAnswers.length} answers
                    </div>
                    {manualAnswers.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteAll}
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
                        onClick={() => handlePageChange(currentPage - 1)}
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
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
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
