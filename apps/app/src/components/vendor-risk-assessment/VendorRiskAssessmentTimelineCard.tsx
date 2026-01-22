'use client';

import { Badge } from '@comp/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@comp/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { useMemo, useState } from 'react';
import type { VendorRiskAssessmentNewsItem } from './vendor-risk-assessment-types';

function formatLongDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (!isValid(d)) return '—';
  return format(d, 'MMMM d, yyyy');
}

function NewsRow({ item }: { item: VendorRiskAssessmentNewsItem }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="rounded-xl bg-muted font-normal">{formatLongDate(item.date)}</Badge>
      </div>

      <div className="text-sm text-foreground leading-relaxed">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-normal hover:text-primary transition-colors cursor-pointer underline"
          >
            {item.title}
          </a>
        ) : (
          <span className="font-normal">{item.title}</span>
        )}
        {item.summary && (
          <>
            {' '}—{' '}
            <span className="text-muted-foreground">{item.summary}</span>
          </>
        )}
        {item.source && (
          <>
            {' '}
            <span className="text-muted-foreground">({item.source})</span>
          </>
        )}
      </div>
    </div>
  );
}

export function VendorRiskAssessmentTimelineCard({
  news,
  previewCount = 3,
}: {
  news: VendorRiskAssessmentNewsItem[];
  previewCount?: number;
}) {
  const [open, setOpen] = useState(false);

  const preview = useMemo(() => news.slice(0, previewCount), [news, previewCount]);
  const rest = useMemo(() => news.slice(previewCount), [news, previewCount]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {news.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No recent news items were captured yet.
          </p>
        ) : (
          <Collapsible open={open} onOpenChange={setOpen}>
            <div className="relative">
              {/* Timeline rail */}
              <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />

              <div className="space-y-5">
                {preview.map((item, index) => (
                  <div
                    key={`${item.date}-${item.title}-${index}`}
                    className="relative pl-6"
                  >
                    <div className="absolute left-[calc(0.5rem-6px)] top-[0.375rem] z-10 h-3 w-3 rounded-full border-2 border-foreground bg-background" />
                    <NewsRow item={item} />
                  </div>
                ))}

                {rest.length > 0 ? (
                  <CollapsibleContent className="space-y-5">
                    {rest.map((item, index) => (
                      <div
                        key={`${item.date}-${item.title}-${previewCount + index}`}
                        className="relative pl-6"
                      >
                        <div className="absolute left-[calc(0.5rem-6px)] top-[0.375rem] z-10 h-3 w-3 rounded-full border-2 border-foreground bg-background" />
                        <NewsRow item={item} />
                      </div>
                    ))}
                  </CollapsibleContent>
                ) : null}
              </div>
            </div>

            {rest.length > 0 ? (
              <div className="pt-1">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {open ? (
                      <>
                        <span>Show less</span>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        <span>Show {rest.length} more</span>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </CollapsibleTrigger>
              </div>
            ) : null}
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}


