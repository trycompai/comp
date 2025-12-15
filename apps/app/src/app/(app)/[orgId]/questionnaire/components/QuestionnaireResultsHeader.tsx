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
  ChevronDown,
  Download,
  File,
  FileSpreadsheet,
  FileText as FileTextIcon,
  Loader2,
  Search,
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
      <div className="flex flex-col gap-4">
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

        <div className="grid grid-cols-3 gap-8">
          {/* Total Questions */}
          <div className="px-4 py-3.5 border-l-2 border-l-primary/40">
            <div className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-widest">
              Questions
            </div>
            <div className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
              {totalCount}
            </div>
          </div>

          {/* Answered */}
          <div className="px-4 py-3.5 border-l-2 border-l-emerald-500/40">
            <div className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-widest">
              Answered
            </div>
            <div className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
              {answeredCount}
            </div>
          </div>

          {/* Progress */}
          <div className="px-4 py-3.5 border-l-2 border-l-blue-500/40">
            <div className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-widest">
              Progress
            </div>
            <div className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
              {progressPercentage}%
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="relative max-w-md animate-in fade-in duration-500 ease-out">
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="text-sm w-80"
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onAutoAnswer();
              }}
              disabled={isAutoAnswering || isLoading}
              size="default"
            >
              {isAutoAnswering ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Zap className="size-4" />
                  Auto-Fill All
                </>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="default" disabled={isExporting} suppressHydrationWarning>
                  <Download className="size-4" />
                  Export
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" suppressHydrationWarning>
                <DropdownMenuItem
                  onClick={() => onExport('xlsx')}
                  disabled={isExporting}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onExport('csv')}
                  disabled={isExporting}
                >
                  <FileTextIcon className="mr-2 h-4 w-4" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onExport('pdf')}
                  disabled={isExporting}
                >
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
