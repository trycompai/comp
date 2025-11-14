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
import { cn } from '@comp/ui/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Input } from '@comp/ui/input';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@comp/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import { Textarea } from '@comp/ui/textarea';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  File,
  FileSpreadsheet,
  FileText,
  FileText as FileTextIcon,
  Link as LinkIcon,
  Loader2,
  Search,
  Sparkles,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import Dropzone, { type FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import { autoAnswerQuestionnaire } from '../actions/auto-answer-questionnaire';
import { exportQuestionnaire } from '../actions/export-questionnaire';
import { parseQuestionnaireAI } from '../actions/parse-questionnaire-ai';

interface QuestionAnswer {
  question: string;
  answer: string | null;
  sources?: Array<{
    sourceType: string;
    sourceName?: string;
    sourceId?: string;
    policyName?: string;
    score: number;
  }>;
}

export function QuestionnaireParser() {
  const params = useParams();
  const orgId = params?.orgId as string;
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [results, setResults] = useState<QuestionAnswer[] | null>(null);
  const [extractedContent, setExtractedContent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingAnswer, setEditingAnswer] = useState('');
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [questionStatuses, setQuestionStatuses] = useState<
    Map<number, 'pending' | 'processing' | 'completed'>
  >(new Map());
  const [hasClickedAutoAnswer, setHasClickedAutoAnswer] = useState(false);
  const [answeringQuestionIndex, setAnsweringQuestionIndex] = useState<number | null>(null);

  const parseAction = useAction(parseQuestionnaireAI, {
    onSuccess: ({ data }: { data: any }) => {
      console.log('Parse action success:', data);
      const responseData = data?.data || data;
      const questionsAndAnswers = responseData?.questionsAndAnswers;
      const extractedContent = responseData?.extractedContent;

      if (questionsAndAnswers && Array.isArray(questionsAndAnswers)) {
        console.log('Setting results:', questionsAndAnswers);
        setResults(questionsAndAnswers);
        setExtractedContent(extractedContent || null);
        setQuestionStatuses(new Map());
        setHasClickedAutoAnswer(false);
        toast.success(`Successfully parsed ${questionsAndAnswers.length} question-answer pairs`);
      } else {
        console.warn('No questionsAndAnswers in data:', { data, responseData });
        toast.error('Parsed data is missing questions');
      }
    },
    onError: ({ error }) => {
      console.error('Parse action error:', error);
      toast.error(error.serverError || 'Failed to parse questionnaire');
    },
  });

  const autoAnswerAction = useAction(autoAnswerQuestionnaire, {
    onSuccess: async ({ data }: { data: any }) => {
      const responseData = data?.data || data;
      const orchestratorTaskId = responseData?.taskId as string | undefined;

      if (!orchestratorTaskId) {
        toast.error('Failed to start auto-answer task');
        return;
      }

      const isSingleQuestion = answeringQuestionIndex !== null;

      if (results && !isSingleQuestion) {
        const statuses = new Map<number, 'pending' | 'processing' | 'completed'>();
        results.forEach((qa, index) => {
          if (!qa.answer || qa.answer.trim().length === 0) {
            statuses.set(index, 'processing');
          } else {
            statuses.set(index, 'completed');
          }
        });
        setQuestionStatuses(statuses);
      }

      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/tasks/${orchestratorTaskId}/status`);
          if (!response.ok) {
            throw new Error('Failed to fetch orchestrator task status');
          }

          const data = await response.json();

          if (data.status === 'COMPLETED' && data.output) {
            clearInterval(pollInterval);

            const answers = data.output.answers as
              | Array<{
                  questionIndex: number;
                  question: string;
                  answer: string | null;
                  sources?: Array<{
                    sourceType: string;
                    sourceName?: string;
                    score: number;
                  }>;
                }>
              | undefined;

            if (answers && Array.isArray(answers)) {
              setResults((prevResults) => {
                if (!prevResults) return prevResults;

                const updatedResults = [...prevResults];
                let answeredCount = 0;

                answers.forEach((answer) => {
                  // For single question, use the answeringQuestionIndex
                  const targetIndex =
                    isSingleQuestion && answeringQuestionIndex !== null
                      ? answeringQuestionIndex
                      : answer.questionIndex;

                  if (answer.answer) {
                    answeredCount++;
                    updatedResults[targetIndex] = {
                      question: answer.question,
                      answer: answer.answer,
                      sources: answer.sources,
                    };

                    setQuestionStatuses((prev) => {
                      const newStatuses = new Map(prev);
                      newStatuses.set(targetIndex, 'completed');
                      return newStatuses;
                    });
                  } else {
                    setQuestionStatuses((prev) => {
                      const newStatuses = new Map(prev);
                      newStatuses.set(targetIndex, 'completed');
                      return newStatuses;
                    });
                  }
                });

                return updatedResults;
              });

              setAnsweringQuestionIndex(null);

              const totalQuestions = answers.length;
              const answeredQuestions = answers.filter((a) => a.answer).length;
              const noAnswerQuestions = totalQuestions - answeredQuestions;

              if (isSingleQuestion) {
                if (answeredQuestions > 0) {
                  toast.success('Answer generated successfully');
                } else {
                  toast.warning(
                    'Could not find relevant information in your policies for this question.',
                  );
                }
              } else {
                if (answeredQuestions > 0) {
                  toast.success(
                    `Answered ${answeredQuestions} of ${totalQuestions} question${totalQuestions > 1 ? 's' : ''}${noAnswerQuestions > 0 ? `. ${noAnswerQuestions} had insufficient information.` : '.'}`,
                  );
                } else {
                  toast.warning(
                    `Could not find relevant information in your policies. Try adding more detail about ${answers[0]?.question.split(' ').slice(0, 5).join(' ')}...`,
                  );
                }
              }
            }
          } else if (data.status === 'FAILED' || data.status === 'CANCELED') {
            clearInterval(pollInterval);
            const errorMessage = data.error || 'Task failed or was canceled';
            toast.error(`Failed to generate answer: ${errorMessage}`);

            setQuestionStatuses((prev) => {
              const newStatuses = new Map(prev);
              prev.forEach((status, index) => {
                if (status === 'processing') {
                  newStatuses.set(index, 'completed');
                }
              });
              return newStatuses;
            });
            setAnsweringQuestionIndex(null);
          }
        } catch (error) {
          console.error('Error polling orchestrator task:', error);
          clearInterval(pollInterval);
          toast.error('Failed to poll auto-answer task status');
        }
      }, 2000);

      setTimeout(
        () => {
          clearInterval(pollInterval);
        },
        10 * 60 * 1000,
      );
    },
    onError: ({ error }) => {
      console.error('Auto-answer action error:', error);
      toast.error(error.serverError || 'Failed to start auto-answer process');
    },
  });

  const exportAction = useAction(exportQuestionnaire, {
    onSuccess: ({ data }: { data: any }) => {
      const responseData = data?.data || data;
      const filename = responseData?.filename;
      const downloadUrl = responseData?.downloadUrl;

      if (downloadUrl && filename) {
        // Trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exported as ${filename}`);
      }
    },
    onError: ({ error }) => {
      console.error('Export action error:', error);
      toast.error(error.serverError || 'Failed to export questionnaire');
    },
  });

  const handleFileSelect = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      toast.error(`File rejected: ${rejectedFiles[0].errors[0].message}`);
      return;
    }

    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const handleParse = async () => {
    if (activeTab === 'file' && selectedFile) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        const fileType = selectedFile.type || 'application/octet-stream';

        await parseAction.execute({
          inputType: 'file',
          fileData: base64,
          fileName: selectedFile.name,
          fileType,
        });
      };
      reader.readAsDataURL(selectedFile);
    } else if (activeTab === 'url' && url.trim()) {
      await parseAction.execute({
        inputType: 'url',
        url: url.trim(),
      });
    }
  };

  const confirmReset = () => {
    handleReset();
    setShowExitDialog(false);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUrl('');
    setResults(null);
    setExtractedContent(null);
    setSearchQuery('');
    setEditingIndex(null);
    setEditingAnswer('');
    setQuestionStatuses(new Map());
    setExpandedSources(new Set());
    setAnsweringQuestionIndex(null);
  };

  const isLoading = parseAction.status === 'executing';
  const isAutoAnswering = autoAnswerAction.status === 'executing';
  const isExporting = exportAction.status === 'executing';

  const handleAutoAnswer = async () => {
    setHasClickedAutoAnswer(true);
    if (!results || results.length === 0) {
      toast.error('Please analyze a questionnaire first');
      return;
    }

    await autoAnswerAction.execute({
      questionsAndAnswers: results,
    });
  };

  const handleAnswerSingleQuestion = async (index: number) => {
    if (!results || !results[index]) {
      toast.error('Question not found');
      return;
    }

    setAnsweringQuestionIndex(index);
    setQuestionStatuses((prev) => {
      const newStatuses = new Map(prev);
      newStatuses.set(index, 'processing');
      return newStatuses;
    });

    try {
      // Call the auto-answer action with just this one question
      await autoAnswerAction.execute({
        questionsAndAnswers: [results[index]],
      });
    } catch (error) {
      console.error('Error answering single question:', error);
      setQuestionStatuses((prev) => {
        const newStatuses = new Map(prev);
        newStatuses.set(index, 'completed');
        return newStatuses;
      });
      setAnsweringQuestionIndex(null);
    }
  };

  const handleEditAnswer = (index: number) => {
    setEditingIndex(index);
    setEditingAnswer(results![index].answer || '');
  };

  const handleSaveAnswer = (index: number) => {
    if (!results) return;
    const updated = [...results];
    updated[index] = {
      ...updated[index],
      answer: editingAnswer.trim() || null,
    };
    setResults(updated);
    setEditingIndex(null);
    setEditingAnswer('');
    toast.success('Answer updated');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingAnswer('');
  };

  const handleExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
    if (!results || results.length === 0) {
      toast.error('No data to export');
      return;
    }

    await exportAction.execute({
      questionsAndAnswers: results,
      format,
    });
  };

  const filteredResults = useMemo(() => {
    if (!results) return null;
    if (!searchQuery.trim()) return results;

    const query = searchQuery.toLowerCase();
    return results.filter(
      (qa) =>
        qa.question.toLowerCase().includes(query) ||
        (qa.answer && qa.answer.toLowerCase().includes(query)),
    );
  }, [results, searchQuery]);

  const answeredCount = useMemo(() => {
    return results?.filter((qa) => qa.answer).length || 0;
  }, [results]);

  const totalCount = results?.length || 0;
  const progressPercentage = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <>
      {results && results.length > 0 ? (
        // Full-width layout when we have results
        <div className="flex flex-col w-full gap-6">
          {/* Header with title and command bar inline */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/50">
            <div className="flex items-center gap-2 lg:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowExitDialog(true)}
                disabled={isLoading}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Exit and start over"
              >
                <X className="h-4 w-4" />
              </Button>

              <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Exit questionnaire session?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will discard all questions and answers. Make sure to export your work
                      before exiting if you want to keep it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={confirmReset}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Exit and Discard
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="h-4 w-px bg-border" />
              <BookOpen className="h-4 lg:h-5 w-4 lg:w-5 text-muted-foreground" />
              <div className="flex flex-col gap-1 lg:gap-1.5">
                <h2 className="text-base lg:text-lg font-semibold text-foreground">
                  Questions & Answers
                </h2>
                <div className="flex items-center gap-2 lg:gap-3">
                  <p className="text-xs text-muted-foreground">
                    {searchQuery && filteredResults ? `${filteredResults.length} of ` : ''}
                    {totalCount} questions • {answeredCount} answered
                  </p>
                  <div className="h-1 w-16 lg:w-20 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Command bar - inline on desktop, stacked on mobile */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:flex-initial">
                  {!hasClickedAutoAnswer && results.some((qa) => !qa.answer) && (
                    <>
                      <style
                        dangerouslySetInnerHTML={{
                          __html: `
                      @keyframes ping-subtle {
                        0%, 100% { transform: scale(1); opacity: 0.8; }
                        60% { transform: scale(1.05); opacity: 0.5; }
                      }
                    `,
                        }}
                      />
                      <span
                        className="absolute -inset-0.5 rounded-md bg-primary/10"
                        style={{ animation: 'ping-subtle 2.5s ease-in-out infinite' }}
                      />
                    </>
                  )}
                  <Button
                    onClick={handleAutoAnswer}
                    disabled={isAutoAnswering || isLoading}
                    size="sm"
                    className="relative z-10 h-9 w-full lg:w-auto"
                  >
                    {isAutoAnswering ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Auto-Answer All
                      </>
                    )}
                  </Button>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isExporting || isLoading}
                      className="h-9"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleExport('xlsx')}
                      disabled={isExporting || isLoading}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExport('csv')}
                      disabled={isExporting || isLoading}
                    >
                      <FileTextIcon className="mr-2 h-4 w-4" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExport('pdf')}
                      disabled={isExporting || isLoading}
                    >
                      <File className="mr-2 h-4 w-4" />
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Results table */}
          <div className="flex flex-col flex-1 min-h-0">
            {results && results.length > 0 ? (
              <>
                <ScrollArea className="flex-1">
                  <div className="pr-4">
                    {filteredResults && filteredResults.length > 0 ? (
                      <>
                        {/* Desktop table view */}
                        <div className="hidden lg:block">
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
                                const hasAnswer = !!qa.answer;

                                return (
                                  <TableRow key={originalIndex} className="border-muted/30">
                                    <TableCell className="font-medium align-middle">
                                      <span className="tabular-nums">{originalIndex + 1}</span>
                                    </TableCell>
                                    <TableCell className="font-medium align-middle">
                                      {qa.question}
                                    </TableCell>
                                    <TableCell className="align-middle">
                                      {isEditing ? (
                                        <div className="space-y-2">
                                          <Textarea
                                            value={editingAnswer}
                                            onChange={(e) => setEditingAnswer(e.target.value)}
                                            className="min-h-[80px]"
                                            autoFocus
                                          />
                                          <div className="flex gap-2">
                                            <Button
                                              size="sm"
                                              onClick={() => handleSaveAnswer(originalIndex)}
                                            >
                                              Save
                                            </Button>
                                            <Button
                                              size="sm"
                                              onClick={handleCancelEdit}
                                              variant="outline"
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          {qa.answer ? (
                                            <div
                                              className="rounded-lg p-2 transition-colors flex items-start gap-2 cursor-pointer hover:bg-muted/50"
                                              onClick={() => handleEditAnswer(originalIndex)}
                                            >
                                              <p className="text-sm text-foreground min-h-[20px] flex-1">
                                                {qa.answer}
                                              </p>
                                            </div>
                                          ) : isProcessing ? (
                                            <div className="flex items-center gap-2 p-2">
                                              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                                              <span className="text-sm text-muted-foreground">
                                                Generating answer...
                                              </span>
                                            </div>
                                          ) : (
                                            <div className="grid grid-cols-2 gap-2 w-full">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEditAnswer(originalIndex)}
                                                className="h-8 w-full"
                                              >
                                                Write Answer
                                              </Button>
                                              <Button
                                                size="sm"
                                                onClick={() =>
                                                  handleAnswerSingleQuestion(originalIndex)
                                                }
                                                disabled={answeringQuestionIndex === originalIndex}
                                                className="h-8 w-full"
                                              >
                                                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                                Auto-Answer
                                              </Button>
                                            </div>
                                          )}
                                          {qa.sources && qa.sources.length > 0 && (
                                            <div>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  const newExpanded = new Set(expandedSources);
                                                  if (newExpanded.has(originalIndex)) {
                                                    newExpanded.delete(originalIndex);
                                                  } else {
                                                    newExpanded.add(originalIndex);
                                                  }
                                                  setExpandedSources(newExpanded);
                                                }}
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
                                                    const isPolicy =
                                                      source.sourceType === 'policy' &&
                                                      source.sourceId;
                                                    const sourceContent =
                                                      source.sourceName || source.sourceType;

                                                    return (
                                                      <div
                                                        key={sourceIndex}
                                                        className="flex items-center gap-2 text-xs"
                                                      >
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
                        </div>

                        {/* Mobile card view */}
                        <div className="lg:hidden space-y-4">
                          {filteredResults.map((qa, index) => {
                            const originalIndex = results.findIndex((r) => r === qa);
                            const isEditing = editingIndex === originalIndex;
                            const questionStatus = questionStatuses.get(originalIndex);
                            const isProcessing = questionStatus === 'processing';

                            return (
                              <div
                                key={originalIndex}
                                className="flex flex-col gap-3 p-4 rounded-lg bg-muted/20 border border-border/30"
                              >
                                {/* Question number and text */}
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-medium text-muted-foreground tabular-nums">
                                    Question {originalIndex + 1}
                                  </span>
                                  <p className="text-sm font-medium text-foreground">
                                    {qa.question}
                                  </p>
                                </div>

                                {/* Answer section */}
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Answer
                                  </span>
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <Textarea
                                        value={editingAnswer}
                                        onChange={(e) => setEditingAnswer(e.target.value)}
                                        className="min-h-[80px]"
                                        autoFocus
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => handleSaveAnswer(originalIndex)}
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={handleCancelEdit}
                                          variant="outline"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {qa.answer ? (
                                        <div
                                          className="rounded-lg p-3 bg-muted/30 border border-border/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                          onClick={() => handleEditAnswer(originalIndex)}
                                        >
                                          <p className="text-sm text-foreground">{qa.answer}</p>
                                        </div>
                                      ) : isProcessing ? (
                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
                                          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                                          <span className="text-sm text-muted-foreground">
                                            Generating answer...
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() =>
                                              handleAnswerSingleQuestion(originalIndex)
                                            }
                                            disabled={answeringQuestionIndex === originalIndex}
                                            className="w-full justify-center"
                                          >
                                            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                            Auto-Answer
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditAnswer(originalIndex)}
                                            className="w-full justify-center"
                                          >
                                            Write Answer
                                          </Button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>

                                {/* Sources */}
                                {qa.sources && qa.sources.length > 0 && (
                                  <div className="pt-2 border-t border-border/30">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newExpanded = new Set(expandedSources);
                                        if (newExpanded.has(originalIndex)) {
                                          newExpanded.delete(originalIndex);
                                        } else {
                                          newExpanded.add(originalIndex);
                                        }
                                        setExpandedSources(newExpanded);
                                      }}
                                      className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground w-full justify-start"
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
                                          const isPolicy =
                                            source.sourceType === 'policy' && source.sourceId;
                                          const sourceContent =
                                            source.sourceName || source.sourceType;

                                          return (
                                            <div
                                              key={sourceIndex}
                                              className="flex items-center gap-2 text-xs"
                                            >
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
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Search className="h-8 w-8 mb-3 opacity-40" />
                        <p className="text-sm font-medium">No matches found</p>
                        <p className="text-xs">Try a different search term</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        // Two-column layout - upload on left, info on right
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 w-full items-start">
          {/* Main upload area - takes 2 columns */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              className="w-full"
            >
              <TabsList className="inline-flex h-9 w-full sm:w-auto">
                <TabsTrigger
                  value="file"
                  className="gap-2 text-sm flex-1 sm:flex-initial"
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">File Upload</span>
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2 text-sm flex-1 sm:flex-initial">
                  <LinkIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">URL</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4 mt-6">
                  {selectedFile ? (
                    <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border border-border/40">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedFile(null)}
                        disabled={isLoading}
                        className="h-9 w-9 shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Dropzone
                      onDrop={handleFileSelect}
                      maxSize={10 * 1024 * 1024}
                      maxFiles={1}
                      multiple={false}
                      disabled={isLoading}
                    >
                      {({ getRootProps, getInputProps, isDragActive }) => (
                        <div
                          {...getRootProps()}
                          className={cn(
                            'flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-xl p-12 lg:p-16 cursor-pointer transition-all',
                            isDragActive
                              ? 'border-primary bg-primary/5 scale-[1.01]'
                              : 'border-border/40 bg-muted/10 hover:border-primary/40 hover:bg-muted/20',
                            isLoading && 'opacity-50 pointer-events-none',
                          )}
                        >
                          <input {...getInputProps()} />
                          <div className="flex flex-col items-center gap-3">
                            <Upload className="h-10 w-10 text-muted-foreground" />
                            <div className="text-center space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                {isDragActive ? 'Drop file here' : 'Drag & drop or click to select'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                PDF, Excel, CSV, Word (max 10MB)
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </Dropzone>
                  )}
                </TabsContent>

                <TabsContent value="url" className="space-y-4 mt-6">
                  <Input
                    id="questionnaire-url"
                    type="url"
                    placeholder="https://example.com/questionnaire"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isLoading}
                    className="h-11 lg:h-12"
                  />
                </TabsContent>
            </Tabs>

            {/* Action Button */}
            <div className="flex items-center justify-end">
              <Button
                onClick={handleParse}
                disabled={
                  isLoading ||
                  (activeTab === 'file' && !selectedFile) ||
                  (activeTab === 'url' && !url.trim())
                }
                className="h-11 lg:h-12 px-6 lg:px-8 w-full sm:w-auto"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Analyze Questionnaire
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Info sidebar - takes 1 column, hidden on mobile */}
          <div className="hidden lg:flex flex-col gap-6">
            <div className="flex flex-col gap-4 p-6 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground mb-1">AI-Powered Answers</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Our AI automatically reads questions and generates answers based on your
                    organization's policies and documentation.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Accepted Files
              </h4>
              <div className="flex flex-col gap-2">
                {[
                  { icon: FileText, label: 'PDF', desc: 'Adobe PDF documents' },
                  { icon: FileSpreadsheet, label: 'Excel', desc: 'XLS, XLSX spreadsheets' },
                  { icon: FileTextIcon, label: 'CSV', desc: 'Comma-separated data' },
                  { icon: FileText, label: 'Word', desc: 'DOC, DOCX documents' },
                ].map((format, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <format.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{format.label}</p>
                      <p className="text-xs text-muted-foreground">{format.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 p-4 rounded-lg bg-muted/20">
              <p className="text-xs font-medium text-foreground">Quick Tips</p>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Files up to 10MB are supported</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Ensure questions are clearly formatted</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Structured tables work best</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
