'use client';

import { Button } from '@comp/ui/button';
import { Card } from '@comp/ui';
import { ChevronLeft, ChevronRight, ExternalLink, FileText } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { usePagination } from '../../hooks/usePagination';

interface PublishedPoliciesSectionProps {
  policies: Awaited<ReturnType<typeof import('../../data/queries').getPublishedPolicies>>;
}

export function PublishedPoliciesSection({ policies }: PublishedPoliciesSectionProps) {
  const params = useParams();
  const orgId = params.orgId as string;

  const { currentPage, totalPages, paginatedItems, handlePageChange } = usePagination({
    items: policies,
    itemsPerPage: 5,
  });

  return (
    <Card id="published-policies" className="flex flex-col h-full">
      <div className="px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-base font-semibold">Published Policies</span>
              <span className="text-sm text-muted-foreground">({policies.length})</span>
            </div>
      </div>
      <div className="px-6 pb-4 pt-4 flex flex-col flex-1">
            {policies.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No published policies found
              </div>
            ) : (
              <>
            <div className="flex flex-col gap-2 flex-1">
                  {paginatedItems.map((policy) => (
                    <Link
                      key={policy.id}
                      href={`/${orgId}/policies/${policy.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                  className="group rounded-md border border-border bg-background p-3 transition-colors hover:bg-muted/50 hover:border-primary/50 h-[82px] flex items-center"
                    >
                  <div className="flex items-start justify-between gap-2 w-full">
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
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
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
      </div>
    </Card>
  );
}
