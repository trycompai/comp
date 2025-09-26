'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, Globe, Loader2, Search, XCircle } from 'lucide-react';

interface ResearchActivityProps {
  toolName: 'exaSearch' | 'firecrawl';
  input: any;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  output?: any;
  isAnimating: boolean;
}

export function ResearchActivity({
  toolName,
  input,
  state,
  output,
  isAnimating,
}: ResearchActivityProps) {
  const isComplete = state === 'output-available';
  const isError = state === 'output-error';
  const isLoading = state === 'input-streaming' || state === 'input-available';

  const getIcon = () => {
    if (isError) return <XCircle className="h-4 w-4 text-muted-foreground" />;
    if (isComplete) return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    return toolName === 'exaSearch' ? (
      <Search className="h-4 w-4 text-muted-foreground" />
    ) : (
      <Globe className="h-4 w-4 text-muted-foreground" />
    );
  };

  const getTitle = () => {
    if (isError) {
      return 'Research encountered an issue';
    }

    if (toolName === 'exaSearch') {
      if (isComplete) {
        const results = output?.results || [];
        if (results.length === 0) {
          return 'No relevant information found';
        }
        return 'Found relevant documentation';
      }
      return 'Looking for information...';
    }

    if (isComplete) {
      return 'Successfully gathered information';
    }
    return 'Reading documentation...';
  };

  const getResultSummary = () => {
    // Only show summary when complete and available
    if (!isComplete || !output?.summary) return null;

    return (
      <div className="mt-2">
        <p className="text-xs text-muted-foreground">{output.summary}</p>
      </div>
    );
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-muted/30 p-3 transition-all',
        isAnimating && 'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        isError && 'border-muted bg-muted/20',
        isComplete && 'border-muted bg-muted/20',
        isLoading && 'border-muted bg-muted/40',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">{getTitle()}</p>
          {isError && (
            <p className="text-xs text-muted-foreground">
              I'll try a different approach to gather the information needed
            </p>
          )}
          {getResultSummary()}
        </div>
      </div>
    </div>
  );
}
