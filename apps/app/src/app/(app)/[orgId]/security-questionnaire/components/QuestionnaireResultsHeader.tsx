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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Input } from '@comp/ui/input';
import {
  BookOpen,
  ChevronDown,
  Download,
  File,
  FileSpreadsheet,
  FileText as FileTextIcon,
  Loader2,
  Search,
  X,
  Zap,
} from 'lucide-react';
import type { QuestionAnswer } from './types';

interface QuestionnaireResultsHeaderProps {
  showExitDialog: boolean;
  onShowExitDialogChange: (show: boolean) => void;
  onExit: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filteredResults: QuestionAnswer[] | null;
  totalCount: number;
  answeredCount: number;
  progressPercentage: number;
  hasClickedAutoAnswer: boolean;
  results: QuestionAnswer[];
  isLoading: boolean;
  isAutoAnswering: boolean;
  isExporting: boolean;
  onAutoAnswer: () => void;
  onExport: (format: 'xlsx' | 'csv' | 'pdf') => void;
}

export function QuestionnaireResultsHeader({
  showExitDialog,
  onShowExitDialogChange,
  onExit,
  searchQuery,
  onSearchChange,
  filteredResults,
  totalCount,
  answeredCount,
  progressPercentage,
  hasClickedAutoAnswer,
  results,
  isLoading,
  isAutoAnswering,
  isExporting,
  onAutoAnswer,
  onExport,
}: QuestionnaireResultsHeaderProps) {
  return (
    <>
      <div className="flex flex-col gap-4 pb-6 border-b border-border/50">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onShowExitDialogChange(true)}
            disabled={isLoading}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Exit and start over"
          >
            <X className="h-4 w-4" />
          </Button>

          <AlertDialog open={showExitDialog} onOpenChange={onShowExitDialogChange}>
            <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>Exit questionnaire session?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will discard all questions and answers. Make sure to export your work before
                  exiting if you want to keep it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onExit}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Exit and Discard
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="h-5 w-px bg-border flex-shrink-0" />
          <div className="flex flex-col gap-1.5 min-w-0">
            <h2 className="text-lg font-semibold text-foreground">Questions & Answers</h2>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {searchQuery && filteredResults ? `${filteredResults.length} of ` : ''}
                {totalCount} questions • {answeredCount} answered
              </p>
              <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden flex-shrink-0">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:flex-none sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative">
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
                    className="absolute -inset-0.5 rounded-xs bg-primary/10"
                    style={{ animation: 'ping-subtle 2.5s ease-in-out infinite' }}
                  />
                </>
              )}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onAutoAnswer();
                }}
                disabled={isAutoAnswering || isLoading}
                size="default"
                className="relative z-10 h-10 whitespace-nowrap"
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
                  size="default"
                  disabled={isExporting || isLoading}
                  className="h-10 whitespace-nowrap"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onExport('xlsx')}
                  disabled={isExporting || isLoading}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('csv')} disabled={isExporting || isLoading}>
                  <FileTextIcon className="mr-2 h-4 w-4" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('pdf')} disabled={isExporting || isLoading}>
                  <File className="mr-2 h-4 w-4" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </>
  );
}

