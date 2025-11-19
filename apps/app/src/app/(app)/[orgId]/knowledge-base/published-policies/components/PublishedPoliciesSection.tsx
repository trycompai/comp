'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { Button } from '@comp/ui/button';
import { Card } from '@comp/ui';
import { ChevronLeft, ChevronRight, ExternalLink, FileText } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRef } from 'react';
import { usePagination } from '../../hooks/usePagination';

interface PublishedPoliciesSectionProps {
  policies: Awaited<ReturnType<typeof import('../../data/queries').getPublishedPolicies>>;
}

export function PublishedPoliciesSection({ policies }: PublishedPoliciesSectionProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const sectionRef = useRef<HTMLDivElement>(null);

  const { currentPage, totalPages, paginatedItems, handlePageChange } = usePagination({
    items: policies,
    itemsPerPage: 10,
  });

  const handleAccordionChange = (value: string) => {
    // If opening (value is set), scroll to section
    if (value === 'published-policies' && sectionRef.current) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100); // Small delay to allow accordion animation to start
    }
  };

  return (
    <Card ref={sectionRef} id="published-policies">
      <Accordion
        type="single"
        collapsible
        defaultValue="published-policies"
        className="w-full"
        onValueChange={handleAccordionChange}
      >
        <AccordionItem value="published-policies" className="border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-base font-semibold">Published Policies</span>
              <span className="text-sm text-muted-foreground">({policies.length})</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            {policies.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No published policies found
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  {paginatedItems.map((policy) => (
                    <Link
                      key={policy.id}
                      href={`/${orgId}/policies/${policy.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-md border border-border bg-background p-3 transition-colors hover:bg-muted/50 hover:border-primary/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-foreground group-hover:text-primary">
                            {policy.name}
                          </h4>
                          {policy.description && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {policy.description}
                            </p>
                          )}
                        </div>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  ))}
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
