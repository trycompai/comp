'use client';

import { parseQuestionnaireAI } from '../actions/parse-questionnaire-ai';
import { autoAnswerQuestionnaire } from '../actions/auto-answer-questionnaire';
import { exportQuestionnaire } from '../actions/export-questionnaire';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@comp/ui/table';
import { Textarea } from '@comp/ui/textarea';
import { ScrollArea } from '@comp/ui/scroll-area';
import { cn } from '@comp/ui/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { FileText, Link as LinkIcon, Loader2, Paperclip, Upload, X, Sparkles, Search, FileSpreadsheet, FileText as FileTextIcon, File, ChevronDown, ChevronUp, BookOpen, Zap, CheckCircle2, Circle, Download } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState, useCallback, useMemo } from 'react';
import Dropzone, { type FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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
  const [activeTab, setActiveTab] = useState<'file' | 'url' | 'attachment'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [attachmentId, setAttachmentId] = useState('');
  const [results, setResults] = useState<QuestionAnswer[] | null>(null);
  const [extractedContent, setExtractedContent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingAnswer, setEditingAnswer] = useState('');
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [questionStatuses, setQuestionStatuses] = useState<Map<number, 'pending' | 'processing' | 'completed'>>(new Map());
  const [hasClickedAutoAnswer, setHasClickedAutoAnswer] = useState(false);

  const parseAction = useAction(parseQuestionnaireAI, {
    onSuccess: ({ data }: {data: any}) => {
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
        toast.error('Failed to start auto-answer orchestrator task');
        return;
      }

      if (results) {
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

            const answers = data.output.answers as Array<{
              questionIndex: number;
              question: string;
              answer: string | null;
              sources?: Array<{
                sourceType: string;
                sourceName?: string;
                score: number;
              }>;
            }> | undefined;

            if (answers && Array.isArray(answers)) {
              setResults((prevResults) => {
                if (!prevResults) return prevResults;
                
                const updatedResults = [...prevResults];
                let answeredCount = 0;
                
                answers.forEach((answer) => {
                  if (answer.answer) {
                    answeredCount++;
                    updatedResults[answer.questionIndex] = {
                      question: answer.question,
                      answer: answer.answer,
                      sources: answer.sources,
                    };
                    
                    setQuestionStatuses((prev) => {
                      const newStatuses = new Map(prev);
                      newStatuses.set(answer.questionIndex, 'completed');
                      return newStatuses;
                    });
                  } else {
                    setQuestionStatuses((prev) => {
                      const newStatuses = new Map(prev);
                      newStatuses.set(answer.questionIndex, 'completed');
                      return newStatuses;
                    });
                  }
                });
                
                return updatedResults;
              });

              const totalQuestions = answers.length;
              const answeredQuestions = answers.filter(a => a.answer).length;
              const noAnswerQuestions = totalQuestions - answeredQuestions;

              if (answeredQuestions > 0) {
                toast.success(`Auto-answered ${answeredQuestions} question${answeredQuestions > 1 ? 's' : ''}.${noAnswerQuestions > 0 ? ` ${noAnswerQuestions} had no evidence found.` : ''}`);
            } else {
                toast.warning(`No answers found for ${totalQuestions} question${totalQuestions > 1 ? 's' : ''}. Please ensure your policies and context are properly configured.`);
              }
            }
          } else if (data.status === 'FAILED' || data.status === 'CANCELED') {
            clearInterval(pollInterval);
            const errorMessage = data.error || 'Task failed or was canceled';
            toast.error(`Auto-answer failed: ${errorMessage}`);
            
            setQuestionStatuses((prev) => {
              const newStatuses = new Map(prev);
              prev.forEach((status, index) => {
                if (status === 'processing') {
                  newStatuses.set(index, 'completed');
                }
              });
              return newStatuses;
            });
          }
        } catch (error) {
          console.error('Error polling orchestrator task:', error);
          clearInterval(pollInterval);
          toast.error('Failed to poll auto-answer task status');
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(pollInterval);
      }, 10 * 60 * 1000);
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
      if (filename) {
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
    } else if (activeTab === 'attachment' && attachmentId.trim()) {
        await parseAction.execute({
          inputType: 'attachment',
          attachmentId: attachmentId.trim(),
        });
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUrl('');
    setAttachmentId('');
    setResults(null);
    setExtractedContent(null);
    setSearchQuery('');
    setEditingIndex(null);
    setEditingAnswer('');
  };

  const isLoading = parseAction.status === 'executing';
  const isAutoAnswering = autoAnswerAction.status === 'executing';
  const isExporting = exportAction.status === 'executing';

  const handleAutoAnswer = async () => {
    setHasClickedAutoAnswer(true);
    if (!results || results.length === 0) {
      toast.error('Please parse a questionnaire first');
      return;
    }

    await autoAnswerAction.execute({
      questionsAndAnswers: results,
    });
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
        (qa.answer && qa.answer.toLowerCase().includes(query))
    );
  }, [results, searchQuery]);

  const answeredCount = useMemo(() => {
    return results?.filter(qa => qa.answer).length || 0;
  }, [results]);

  const totalCount = results?.length || 0;
  const progressPercentage = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <>
      {results && results.length > 0 ? (
        // Single card layout when we have results - full width
        <Card className="flex flex-col border w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Questions & Answers
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                {!hasClickedAutoAnswer && results.some(qa => !qa.answer) && (
                  <>
                    <style dangerouslySetInnerHTML={{
                      __html: `
                        @keyframes ping-subtle {
                          0%, 100% { transform: scale(1); opacity: 0.8; }
                          60% { transform: scale(1.05); opacity: 0.5; }
                        }
                      `
                    }} />
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
                  className="relative z-10"
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
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport('csv')}
                    disabled={isExporting || isLoading}
                  >
                    <FileTextIcon className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport('pdf')}
                    disabled={isExporting || isLoading}
                  >
                    <File className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isLoading}
                size="sm"
              >
                <X className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
          {results && results.length > 0 && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {filteredResults?.length ?? totalCount}{searchQuery ? ` of ${totalCount}` : ''} questions
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium tabular-nums">{answeredCount}</span>
                <span>/</span>
                <span className="tabular-nums">{totalCount}</span>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0">
          {results && results.length > 0 ? (
            <>
              <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions or answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="pr-4">
                  {filteredResults && filteredResults.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-muted/50">
                          <TableHead className="w-12">#</TableHead>
                          <TableHead className="min-w-[300px]">Question</TableHead>
                          <TableHead className="min-w-[300px]">Answer</TableHead>
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
                                    <div 
                                      className={cn(
                                        "rounded-lg p-2 transition-colors flex items-start gap-2",
                                        !isProcessing && "cursor-pointer hover:bg-muted/50"
                                      )}
                                      onClick={() => !isProcessing && handleEditAnswer(originalIndex)}
                                    >
                                      {isProcessing && (
                                        <Loader2 className="h-4 w-4 animate-spin text-primary mt-0.5 shrink-0" />
                                      )}
                                      <p className="text-sm text-foreground min-h-[20px] flex-1">
                                        {qa.answer ?? (
                                          <span className="italic text-muted-foreground/70">
                                            {isProcessing 
                                              ? '' 
                                              : questionStatus === 'completed' 
                                                ? 'No answer provided' 
                                                : ''}
                                          </span>
                                        )}
                                      </p>
                                    </div>
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
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No results found</p>
                      <p className="text-xs">Try adjusting your search query</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Ready to Parse</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Upload a file, provide a URL, or select an attachment to get started with AI-powered questionnaire parsing.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      ) : (
        // Single card layout when no results - centered and max width
        <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
          <Card className="flex flex-col border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Questionnaire Parser
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="file" className="gap-2">
                  <Upload className="h-4 w-4" />
                  File
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2">
                  <LinkIcon className="h-4 w-4" />
                  URL
                </TabsTrigger>
                <TabsTrigger value="attachment" className="gap-2">
                  <Paperclip className="h-4 w-4" />
                  Link
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-3 mt-4">
                {selectedFile ? (
                  <div className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedFile(null)}
                      disabled={isLoading}
                      className="h-8 w-8 shrink-0"
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
                          'flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors',
                          isDragActive
                            ? 'border-primary bg-muted/50'
                            : 'border-muted-foreground/30 hover:border-primary/50',
                          isLoading && 'opacity-50 pointer-events-none',
                        )}
                      >
                        <input {...getInputProps()} />
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <div className="text-center space-y-1">
                          <p className="text-sm font-medium">
                            {isDragActive ? 'Drop file here' : 'Drag & drop or click to select'}
                          </p>
                          <p className="text-xs text-muted-foreground">PDF, Excel, CSV, Word (max 10MB)</p>
                        </div>
                      </div>
                    )}
                  </Dropzone>
                )}
              </TabsContent>

              <TabsContent value="url" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="questionnaire-url">Questionnaire URL</Label>
                  <Input
                    id="questionnaire-url"
                    type="url"
                    placeholder="https://example.com/questionnaire"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </TabsContent>

              <TabsContent value="attachment" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="attachment-id">Attachment ID</Label>
                  <Input
                    id="attachment-id"
                    type="text"
                    placeholder="Enter attachment ID"
                    value={attachmentId}
                    onChange={(e) => setAttachmentId(e.target.value)}
                    disabled={isLoading}
                  />
              </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-col gap-2 pt-2 border-t">
              <Button
                onClick={handleParse}
                disabled={isLoading || (activeTab === 'file' && !selectedFile) || (activeTab === 'url' && !url.trim()) || (activeTab === 'attachment' && !attachmentId.trim())}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Parse Questionnaire
                  </>
                )}
              </Button>
              {(selectedFile || url || attachmentId) && (
                <Button 
                  variant="outline" 
                  onClick={handleReset} 
                  disabled={isLoading}
                  className="w-full"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      )}
    </>
  );
}
