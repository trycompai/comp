'use client';

import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Finding, FindingStatus } from '@db';
import { ArrowRight, CheckCircle2, FileWarning } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const STATUS_COLORS: Record<FindingStatus, string> = {
  open: 'bg-red-100 text-red-700 border-red-200',
  ready_for_review: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  needs_revision: 'bg-orange-100 text-orange-700 border-orange-200',
  closed: 'bg-primary/10 text-primary border-primary/20',
};

const STATUS_LABELS: Record<FindingStatus, string> = {
  open: 'Open',
  ready_for_review: 'Auditor Review',
  needs_revision: 'Revision',
  closed: 'Closed',
};

const TYPE_LABELS: Record<string, string> = {
  soc2: 'SOC 2',
  iso27001: 'ISO 27001',
};

// Filter button styles matching status colors
const FILTER_BUTTON_STYLES: Record<FindingStatus, { active: string; inactive: string }> = {
  open: {
    active: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-100',
    inactive: 'hover:bg-red-50 hover:text-red-700 hover:border-red-200',
  },
  ready_for_review: {
    active: 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-100',
    inactive: 'hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200',
  },
  needs_revision: {
    active: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-100',
    inactive: 'hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200',
  },
  closed: {
    active: 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/10',
    inactive: 'hover:bg-primary/5 hover:text-primary hover:border-primary/20',
  },
};

// Order for displaying filter buttons
const STATUS_DISPLAY_ORDER: FindingStatus[] = [
  FindingStatus.open,
  FindingStatus.needs_revision,
  FindingStatus.ready_for_review,
  FindingStatus.closed,
];

interface FindingWithTask extends Finding {
  task: {
    id: string;
    title: string;
  };
}

export function FindingsOverview({
  findings,
  organizationId,
}: {
  findings: FindingWithTask[];
  organizationId: string;
}) {
  const [activeFilter, setActiveFilter] = useState<FindingStatus | null>(null);

  // Sort findings by updatedAt only (most recently updated first)
  const sortedFindings = useMemo(() => {
    return [...findings].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [findings]);

  // Filter findings based on active filter
  const filteredFindings = useMemo(() => {
    if (activeFilter === null) return sortedFindings;
    return sortedFindings.filter((f) => f.status === activeFilter);
  }, [sortedFindings, activeFilter]);

  // Count by status for filter buttons
  const statusCounts = useMemo(() => {
    return findings.reduce(
      (acc, finding) => {
        acc[finding.status] = (acc[finding.status] || 0) + 1;
        return acc;
      },
      {} as Record<FindingStatus, number>,
    );
  }, [findings]);

  const closedCount = statusCounts.closed || 0;
  const totalCount = findings.length;
  const progressWidth = totalCount > 0 ? (closedCount / totalCount) * 100 : 100;

  const handleFilterClick = (status: FindingStatus) => {
    setActiveFilter((current) => (current === status ? null : status));
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileWarning className="h-4 w-4" />
            Findings
          </CardTitle>
        </div>

        <div className="bg-secondary/50 relative mt-2 h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all"
            style={{
              width: `${progressWidth}%`,
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {closedCount} of {totalCount} findings resolved
        </p>

        {/* Status filter buttons */}
        {totalCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {STATUS_DISPLAY_ORDER.map((status) => {
              const count = statusCounts[status] || 0;
              if (count === 0) return null;
              const isActive = activeFilter === status;
              const styles = FILTER_BUTTON_STYLES[status];

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleFilterClick(status)}
                  className={`
                    inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
                    border transition-colors cursor-pointer
                    ${isActive ? styles.active : `bg-transparent border-border ${styles.inactive}`}
                  `}
                >
                  {STATUS_LABELS[status]}
                  <span
                    className={`
                      inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-semibold
                      ${isActive ? 'bg-white/50' : 'bg-muted'}
                    `}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
            {activeFilter !== null && (
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-col flex-1">
        {findings.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-lg p-4 mt-2 bg-border/50">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">No findings</span>
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-lg p-4 mt-2 bg-border/50">
            <span className="text-sm text-muted-foreground">
              No {activeFilter ? STATUS_LABELS[activeFilter].toLowerCase() : ''} findings
            </span>
          </div>
        ) : (
          <div className="h-[300px] mt-2">
            <ScrollArea className="h-full">
              <div className="space-y-0 pr-4">
                {filteredFindings.map((finding, index) => (
                  <div key={finding.id}>
                    <div className="flex items-start justify-between py-3 px-1">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full shrink-0">
                          <FileWarning className="h-3 w-3" />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground line-clamp-1">
                            {finding.task.title}
                          </span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[finding.status]}`}
                            >
                              {STATUS_LABELS[finding.status]}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {TYPE_LABELS[finding.type] || finding.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {finding.content}
                          </p>
                        </div>
                      </div>
                      <Button asChild size="icon" variant="outline" className="shrink-0 ml-2">
                        <Link
                          href={`/${organizationId}/tasks/${finding.task.id}#finding-${finding.id}`}
                        >
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                    {index < filteredFindings.length - 1 && (
                      <div className="border-t border-muted/30" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
