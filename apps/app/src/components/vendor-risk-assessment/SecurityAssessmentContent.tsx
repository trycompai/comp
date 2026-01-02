'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@comp/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import remarkGfm from 'remark-gfm';
import { MemoizedReactMarkdown } from '@/components/markdown';

interface SecurityAssessmentContentProps {
  text: string;
  maxLength?: number;
}

export function SecurityAssessmentContent({
  text,
  maxLength = 500,
}: SecurityAssessmentContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = text.length > maxLength;

  if (!isLong) {
    return (
      <div className="text-sm text-foreground/90 leading-7">
        <MemoizedReactMarkdown remarkPlugins={[remarkGfm]}>
          {text}
        </MemoizedReactMarkdown>
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="relative">
        <div
          className={
            isExpanded ? '' : 'max-h-48 overflow-hidden transition-all duration-300 ease-in-out'
          }
        >
          <div className="text-sm text-foreground/90 leading-7">
            <MemoizedReactMarkdown remarkPlugins={[remarkGfm]}>
              {text}
            </MemoizedReactMarkdown>
          </div>
        </div>
        <div
          className={`absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none transition-opacity duration-300 ease-in-out ${
            isExpanded ? 'opacity-0' : 'opacity-100'
          }`}
        />
        {/* CollapsibleContent is intentionally unused: we render the full markdown once and control visibility via max-height */}
        <CollapsibleContent />
      </div>
      <div className="pt-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <>
                <span>Show less</span>
                <ChevronUp className="h-3.5 w-3.5 transition-transform duration-300 ease-in-out" />
              </>
            ) : (
              <>
                <span>Show more</span>
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300 ease-in-out" />
              </>
            )}
          </button>
        </CollapsibleTrigger>
      </div>
    </Collapsible>
  );
}


