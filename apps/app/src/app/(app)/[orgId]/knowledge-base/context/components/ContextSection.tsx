'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Card } from '@comp/ui';
import { isJSON } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ExternalLink, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRef } from 'react';
import { usePagination } from '../../hooks/usePagination';

interface ContextSectionProps {
  contextEntries: Awaited<ReturnType<typeof import('../../data/queries').getContextEntries>>;
}

function hasValidAnswer(answer: string): boolean {
  if (!answer || answer.trim() === '') {
    return false;
  }

  if (isJSON(answer)) {
    try {
      const parsed = JSON.parse(answer);
      // Check if there are any non-empty values
      const hasNonEmptyValue = Object.values(parsed).some((value) => {
        if (typeof value === 'string') {
          return value.trim() !== '';
        }
        return !!value;
      });
      return hasNonEmptyValue;
    } catch {
      return false;
    }
  }

  return true;
}

function formatAnswer(answer: string): string {
  if (isJSON(answer)) {
    try {
      const parsed = JSON.parse(answer);
      const entries = Object.entries(parsed)
        .filter(([key, value]) => {
          if (typeof value === 'string') {
            return value.trim() !== '';
          }
          return !!value;
        })
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      return entries || '';
    } catch {
      return answer;
    }
  }

  return answer;
}

export function ContextSection({ contextEntries }: ContextSectionProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const sectionRef = useRef<HTMLDivElement>(null);

  const validEntries = contextEntries.filter((entry) => hasValidAnswer(entry.answer));

  const { currentPage, totalPages, paginatedItems, handlePageChange } = usePagination({
    items: validEntries,
    itemsPerPage: 10,
  });

  const handleAccordionChange = (value: string) => {
    // If opening (value is set), scroll to section
    if (value === 'context' && sectionRef.current) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100); // Small delay to allow accordion animation to start
    }
  };

  return (
    <Card ref={sectionRef} id="context">
      <Accordion type="single" collapsible className="w-full" onValueChange={handleAccordionChange}>
        <AccordionItem value="context" className="border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <span className="text-base font-semibold">Context</span>
              <span className="text-sm text-muted-foreground">
                ({validEntries.length})
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            {validEntries.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No context entries found
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  {paginatedItems.map((entry) => {
                    const formattedAnswer = formatAnswer(entry.answer);
                    return (
                      <Link
                        key={entry.id}
                        href={`/${orgId}/settings/context-hub`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group rounded-md border border-border bg-background p-3 transition-colors hover:bg-muted/50 hover:border-primary/50"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-semibold text-foreground group-hover:text-primary">
                            {entry.question}
                          </span>
                          <span className="text-muted-foreground">—</span>
                          <span className="text-muted-foreground line-clamp-1 flex-1">
                            {formattedAnswer}
                          </span>
                          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-end">
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
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
