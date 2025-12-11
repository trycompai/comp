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
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card } from '@comp/ui';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { Building2, CheckCircle2, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Filter, Globe2, Loader2, Search, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
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
  const filterSectionRef = useRef<HTMLDivElement>(null);
  const {
    searchQuery,
    setSearchQuery,
    sourceFilter,
    setSourceFilter,
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedQuestionnaires,
    totalFiltered,
    handlePageChange,
    handleItemsPerPageChange,
  } = useQuestionnaireHistory({ questionnaires });

  const handleSourceFilterChange = (value: 'all' | 'internal' | 'external') => {
    setSourceFilter(value);
    // Scroll to keep filter section in view
    setTimeout(() => {
      filterSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

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
      {/* Search Input and Source Filter */}
      <div ref={filterSectionRef} className="flex items-center justify-between gap-4 flex-wrap">
        {/* Search Input */}
        <div className="relative w-[280px] animate-in fade-in duration-500 ease-out">
          <Input
            placeholder="Search by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
            leftIcon={<Search className="h-4 w-4 text-muted-foreground" />}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm p-0.5 transition-all animate-in fade-in duration-300 ease-out"
              type="button"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Source Filter */}
        <div className="relative animate-in fade-in duration-500 ease-out" style={{ animationDelay: '50ms' }}>
          <Select
            value={sourceFilter}
            onValueChange={(value) => handleSourceFilterChange(value as 'all' | 'internal' | 'external')}
          >
            <SelectTrigger className="h-9 w-[180px] bg-background border-border/50 hover:border-border shadow-xs transition-colors">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1"/>
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>All Sources</span>
                </div>
              </SelectItem>
              <SelectItem value="internal">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>Dashboard</span>
                </div>
              </SelectItem>
              <SelectItem value="external">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Trust Center</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      {searchQuery && (
        <div className="animate-in fade-in duration-500 ease-out">
          <p className="text-sm text-muted-foreground">
            {totalFiltered} {totalFiltered === 1 ? 'result' : 'results'} found
          </p>
        </div>
      )}

      {/* Questionnaire List */}
      {paginatedQuestionnaires.length === 0 ? (
        <Card className="animate-in fade-in duration-700 ease-out">
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
          {paginatedQuestionnaires.map((questionnaire: Awaited<ReturnType<typeof import('../data/queries').getQuestionnaires>>[number], index) => (
            <div
              key={questionnaire.id}
              className="animate-in fade-in duration-500 ease-out"
              style={{ 
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'backwards'
              }}
            >
              <QuestionnaireHistoryItem
                questionnaire={questionnaire}
                orgId={orgId}
                router={router}
              />
            </div>
          ))}
        </div>
      )}

      {/* Pagination and Items Per Page */}
      <div className="flex items-center justify-between pt-2">
        {/* Items Per Page */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in duration-500 ease-out">
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => handleItemsPerPageChange(Number.parseInt(value, 10))}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
            </SelectContent>
          </Select>
          <span>per page</span>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 animate-in fade-in duration-500 ease-out" style={{ animationDelay: '50ms' }}>
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
        )}
      </div>
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
  const [isClicking, setIsClicking] = useState(false);

  const answeredCount = questionnaire.questions.filter((q: { answer: string | null }) => q.answer).length;
        const totalQuestions = questionnaire.questions.length;
        const isParsing = questionnaire.status === 'parsing';
  const FileIcon = getFileIcon(questionnaire.filename);

  const handleItemClick = () => {
    if (!isParsing) {
      setIsClicking(true);
      setTimeout(() => {
        router.push(`/${orgId}/questionnaire/${questionnaire.id}`);
      }, 150);
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

  const isCompleted = answeredCount === totalQuestions && totalQuestions > 0;

  return (
    <>
      <Card
        className={`group relative overflow-hidden transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${
          isParsing 
            ? 'cursor-not-allowed opacity-75' 
            : `cursor-pointer hover:shadow-sm hover:border-primary/50 hover:-translate-y-1 active:scale-[0.98] ${
                isClicking ? 'scale-95 shadow-none translate-y-0 opacity-80' : ''
              }`
        }`}
        onClick={handleItemClick}
      >
        <div className="flex items-center gap-4 p-4">
          {/* Icon with gradient background */}
          <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
            isParsing 
              ? 'bg-muted' 
              : 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent'
          }`}>
            {isParsing ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <FileIcon className="h-5 w-5 text-primary" />
                {isCompleted && (
                  <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 ring-2 ring-background">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {questionnaire.filename}
                </h3>
                <div className="mt-1.5 flex items-center gap-3 text-xs flex-wrap">
                  {isParsing ? (
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Parsing...
                    </span>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3" />
                        <span className="min-w-30">
                          {formatDistanceToNow(new Date(questionnaire.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {totalQuestions > 0 && (
                        <div className={`min-w-32 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 transition-colors ${
                          isCompleted 
                            ? 'bg-green-500/10 ring-1 ring-green-500/20' 
                            : 'bg-muted/50'
                        }`}>
                          <span className={`text-[10px] font-medium uppercase tracking-wide ${
                            isCompleted ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'
                          }`}>
                            {isCompleted ? 'Complete' : 'Answered'}
                          </span>
                          <span className={`font-semibold tabular-nums ${
                            isCompleted ? 'text-green-700 dark:text-green-400' : 'text-foreground'
                          }`}>
                            {answeredCount}/{totalQuestions}
                          </span>
                        </div>
                      )}
                      {questionnaire.source === 'external' ? (
                        <Badge 
                          className="gap-1 px-2 py-0.5 text-[10px] font-medium bg-blue-400/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 ring-1 ring-blue-500/20"
                        >
                          <Globe2 className="h-2.5 w-2.5" />
                          Trust Center
                        </Badge>
                      ) : (
                        <Badge 
                          className="gap-1 px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 ring-1 ring-primary/20"
                        >
                          <Building2 className="h-2.5 w-2.5" />
                          Dashboard
                        </Badge>
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
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
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
