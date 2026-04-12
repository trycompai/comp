'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@trycompai/design-system';
import { ChevronDown, ChevronUp } from '@trycompai/design-system/icons';
import { useState } from 'react';
import remarkGfm from 'remark-gfm';
import { MemoizedReactMarkdown } from '@/components/markdown';

interface SecurityAssessmentContentProps {
  text: string;
  maxLength?: number;
}

export function SecurityAssessmentContent({
  text,
  maxLength = 600,
}: SecurityAssessmentContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = text.length > maxLength;

  const markdownStyles = "text-sm text-foreground/90 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mb-3 [&_ol]:mb-3 [&_li]:mb-1 [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mb-1 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded";

  if (!isLong) {
    return (
      <div className={markdownStyles}>
        <MemoizedReactMarkdown remarkPlugins={[remarkGfm]}>
          {text}
        </MemoizedReactMarkdown>
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="relative">
        <div className={isExpanded ? '' : 'max-h-40 overflow-hidden'}>
          <div className={markdownStyles}>
            <MemoizedReactMarkdown remarkPlugins={[remarkGfm]}>
              {text}
            </MemoizedReactMarkdown>
          </div>
        </div>
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}
        <CollapsibleContent />
      </div>
      <div className="pt-2">
        <CollapsibleTrigger
          render={<button type="button" />}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <>
              <span>Show less</span>
              <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              <span>Show more</span>
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </CollapsibleTrigger>
      </div>
    </Collapsible>
  );
}
