'use client';

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
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Loader2, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteQuestionnaireAction } from '../actions/delete-questionnaire';
import { useQuestionnaireHistory } from '../hooks/useQuestionnaireHistory';

function getFileIcon(filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  if (extension === 'pdf') {
    return FileText;
  }

  if (['xls', 'xlsx', 'csv'].includes(extension)) {
    return FileSpreadsheet;
  }

  return FileText;
}

interface QuestionnaireHistoryProps {
  questionnaires: Awaited<ReturnType<typeof import('../data/queries').getQuestionnaires>>;
  orgId: string;
}

export function QuestionnaireHistory({ questionnaires, orgId }: QuestionnaireHistoryProps) {
  const router = useRouter();
  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedQuestionnaires,
    totalFiltered,
    handlePageChange,
    handleItemsPerPageChange,
  } = useQuestionnaireHistory({ questionnaires });

  if (questionnaires.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">No questionnaires yet</p>
              <p className="text-xs text-muted-foreground">
                Create your first questionnaire to see it here
              </p>
            </div>
          </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search Input and Items Per Page */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-[280px]">
          <Input
            placeholder="Search by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              type="button"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Items per page:</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => handleItemsPerPageChange(Number.parseInt(value, 10))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground">
          {totalFiltered} {totalFiltered === 1 ? 'result' : 'results'} found
        </p>
      )}

      {/* Questionnaire List */}
      {paginatedQuestionnaires.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">No questionnaires found</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'Create your first questionnaire to see it here'}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {paginatedQuestionnaires.map((questionnaire: Awaited<ReturnType<typeof import('../data/queries').getQuestionnaires>>[number]) => (
            <QuestionnaireHistoryItem
              key={questionnaire.id}
              questionnaire={questionnaire}
              orgId={orgId}
              router={router}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[80px] text-center">
              {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface QuestionnaireHistoryItemProps {
  questionnaire: Awaited<ReturnType<typeof import('../data/queries').getQuestionnaires>>[number];
  orgId: string;
  router: ReturnType<typeof useRouter>;
}

function QuestionnaireHistoryItem({
  questionnaire,
  orgId,
  router,
}: QuestionnaireHistoryItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const answeredCount = questionnaire.questions.filter((q: { answer: string | null }) => q.answer).length;
        const totalQuestions = questionnaire.questions.length;
        const isParsing = questionnaire.status === 'parsing';
  const FileIcon = getFileIcon(questionnaire.filename);

  const handleItemClick = () => {
    if (!isParsing) {
      router.push(`/${orgId}/questionnaire/${questionnaire.id}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);

    try {
      const result = await deleteQuestionnaireAction({ questionnaireId: questionnaire.id });

      if (result?.data?.success) {
        toast.success('Questionnaire deleted successfully');
        setIsDeleteDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result?.data?.error || 'Failed to delete questionnaire');
      }
    } catch (error) {
      toast.error('An error occurred while deleting the questionnaire');
    } finally {
      setIsDeleting(false);
    }
  };

        return (
    <>
      <Card
        className={`transition-all hover:border-primary/50 ${
          isParsing ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
        }`}
        onClick={handleItemClick}
      >
        <div className="flex items-center gap-4 p-4">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            {isParsing ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <FileIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {questionnaire.filename}
                    </h3>
                <div className="mt-1.5 flex items-center gap-3 text-xs">
                      {isParsing ? (
                    <span className="text-muted-foreground">Parsing...</span>
                      ) : (
                        <>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>
                            {formatDistanceToNow(new Date(questionnaire.createdAt), {
                              addSuffix: true,
                            })}
                        </span>
                      </div>
                      {totalQuestions > 0 && (
                        <div className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Answered
                          </span>
                          <span className="font-semibold tabular-nums text-foreground">
                            {answeredCount}/{totalQuestions}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                  </div>
                  </div>
                </div>

          {/* Delete Button */}
                <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteDialogOpen(true);
            }}
            disabled={isParsing || isDeleting}
                >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete questionnaire</span>
                </Button>
              </div>
          </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Questionnaire</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{questionnaire.filename}</strong>? This action
              cannot be undone and will permanently delete all questions and answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
